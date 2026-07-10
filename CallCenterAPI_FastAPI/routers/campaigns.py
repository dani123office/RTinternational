from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Header, Request, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from ..database import get_db
from ..models import User, Campaign, CampaignLead
from .auth import get_current_user, require_admin_or_manager
from ..schemas import CampaignCreate, CampaignLeadUpdate, CampaignLeadOut, CampaignOut
from ..utils.logger import log_activity, get_client_ip

router = APIRouter(prefix="/api/campaigns", tags=["campaigns"])


def _lead_to_out(l: CampaignLead) -> CampaignLeadOut:
    return CampaignLeadOut(
        id=l.id,
        campaignId=l.campaign_id,
        businessName=l.business_name,
        ownerName=l.owner_name,
        phone=l.phone,
        postcode=l.postcode,
        notes=l.notes,
        status=l.status,
        outcome=l.outcome,
        calledAt=l.called_at,
    )


def _get_campaign_stats(db: Session, c: Campaign) -> CampaignOut:
    total = db.query(func.count(CampaignLead.id)).filter(CampaignLead.campaign_id == c.id).scalar() or 0
    called = db.query(func.count(CampaignLead.id)).filter(CampaignLead.campaign_id == c.id, CampaignLead.status != "pending").scalar() or 0
    pending = total - called

    # Count outcomes
    outcomes = db.query(
        CampaignLead.outcome,
        func.count(CampaignLead.id)
    ).filter(
        CampaignLead.campaign_id == c.id,
        CampaignLead.outcome.isnot(None)
    ).group_by(CampaignLead.outcome).all()

    outcome_stats = {
        "no_answer": 0,
        "not_interested": 0,
        "callback": 0,
        "transfer": 0,
        "sale": 0
    }
    for outcome_type, count in outcomes:
        if outcome_type in outcome_stats:
            outcome_stats[outcome_type] = count

    return CampaignOut(
        id=c.id,
        name=c.name,
        assignedToId=c.assigned_to_id,
        assignedToName=c.assigned_to.name if c.assigned_to else None,
        createdById=c.created_by_id,
        createdByName=c.created_by.name if c.created_by else None,
        createdAt=c.created_at,
        status=c.status,
        totalLeads=total,
        calledLeads=called,
        pendingLeads=pending,
        outcomeStats=outcome_stats,
    )


@router.post("")
def create_campaign(
    dto: CampaignCreate,
    request: Request,
    current_user: User = Depends(require_admin_or_manager),
    db: Session = Depends(get_db),
):
    # Verify assignee exists and is an active agent
    agent = db.query(User).filter(User.id == dto.assignedToId, User.role == "agent").first()
    if not agent:
        raise HTTPException(status_code=400, detail="Assigned user must be an active agent")

    # Create Campaign
    campaign = Campaign(
        name=dto.name,
        assigned_to_id=dto.assignedToId,
        created_by_id=current_user.id,
        status="active",
        created_at=datetime.now(),
    )
    db.add(campaign)
    db.flush()  # Get campaign.id

    # Create Leads
    leads_to_create = []
    for lead in dto.leads:
        leads_to_create.append(
            CampaignLead(
                campaign_id=campaign.id,
                business_name=lead.businessName,
                owner_name=lead.ownerName,
                phone=lead.phone,
                postcode=lead.postcode,
                notes=lead.notes,
                status="pending",
            )
        )
    db.bulk_save_objects(leads_to_create)
    db.commit()
    db.refresh(campaign)

    log_activity(db, current_user.id, "created", "campaign", campaign.id,
                 f"Created campaign '{campaign.name}' and assigned to agent {agent.name}",
                 get_client_ip(request))

    return _get_campaign_stats(db, campaign)


@router.get("")
def list_campaigns(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    agent_id: Optional[int] = Query(None, alias="agentId")
):
    query = db.query(Campaign)

    # Restrict agents to only their own assigned campaigns
    if current_user.role == "agent":
        query = query.filter(Campaign.assigned_to_id == current_user.id)
    else:
        # Managers/admins can filter by agentId if specified
        if agent_id:
            query = query.filter(Campaign.assigned_to_id == agent_id)
        
        # Managers can only see campaigns assigned to agents under them or created by them (if not admin)
        if current_user.role == "manager":
            # get list of agent ids assigned to this manager
            sub_agents = db.query(User.id).filter(User.manager_id == current_user.id).all()
            sub_agent_ids = [s[0] for s in sub_agents]
            query = query.filter(
                (Campaign.assigned_to_id.in_(sub_agent_ids)) | 
                (Campaign.created_by_id == current_user.id)
            )

    campaigns = query.order_by(Campaign.created_at.desc()).all()
    return [_get_campaign_stats(db, c) for c in campaigns]


@router.get("/{campaign_id}/leads")
def get_campaign_leads(
    campaign_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    # Access checks
    if current_user.role == "agent" and campaign.assigned_to_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this campaign")
    elif current_user.role == "manager":
        # Check if agent belongs to manager
        agent = db.query(User).filter(User.id == campaign.assigned_to_id).first()
        if not agent or (agent.manager_id != current_user.id and campaign.created_by_id != current_user.id):
            raise HTTPException(status_code=403, detail="Not authorized to access this campaign")

    leads = db.query(CampaignLead).filter(CampaignLead.campaign_id == campaign_id).order_by(CampaignLead.id.asc()).all()
    return [_lead_to_out(l) for l in leads]


@router.put("/leads/{lead_id}")
def update_campaign_lead(
    lead_id: int,
    dto: CampaignLeadUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    lead = db.query(CampaignLead).filter(CampaignLead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    # Verify agent owns the campaign
    campaign = db.query(Campaign).filter(Campaign.id == lead.campaign_id).first()
    if current_user.role == "agent" and campaign.assigned_to_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to modify this campaign lead")

    lead.status = dto.status
    lead.outcome = dto.outcome
    lead.called_at = datetime.now() if dto.status != "pending" else None
    if dto.notes is not None:
        lead.notes = dto.notes

    db.commit()
    db.refresh(lead)
    return _lead_to_out(lead)


@router.delete("/{campaign_id}")
def delete_campaign(
    campaign_id: int,
    request: Request,
    current_user: User = Depends(require_admin_or_manager),
    db: Session = Depends(get_db),
):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    # Manager authorization check
    if current_user.role == "manager" and campaign.created_by_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this campaign")

    campaign_name = campaign.name
    db.delete(campaign)
    db.commit()

    log_activity(db, current_user.id, "deleted", "campaign", campaign_id,
                 f"Deleted campaign '{campaign_name}'",
                 get_client_ip(request))

    return {"ok": True, "message": "Campaign deleted successfully"}
