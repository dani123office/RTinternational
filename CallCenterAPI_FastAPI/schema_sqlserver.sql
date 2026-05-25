-- ================================================================
--  RT INTERNATIONAL — CALL CENTRE CRM
--  SQL Server Schema v3.0
--
--  PIPELINE FLOW:
--    CALLBACK -> TRANSFER -> SALE
--
--  TABLES:
--    1.  users
--    2.  customers
--    3.  electricity_meters
--    4.  gas_meters
--    5.  call_backs
--    6.  transfers
--    7.  sales
--    8.  activity_logs
--    9.  notifications
-- ================================================================

CREATE TABLE users (
    id                  INT             NOT NULL IDENTITY(1,1),
    name                VARCHAR(100)    NOT NULL,
    email               VARCHAR(150)    NOT NULL,
    password_hash       VARCHAR(255)    NOT NULL,
    role                VARCHAR(10)     NOT NULL DEFAULT 'agent'
                        CHECK (role IN ('admin','manager','agent')),
    manager_id          INT             NULL,
    phone               VARCHAR(20)     NULL,
    commission_rate     DECIMAL(5,2)    NOT NULL DEFAULT 0.00,
    is_active           BIT             NOT NULL DEFAULT 1,
    last_login_at       DATETIME2       NULL,
    created_at          DATETIME2       NOT NULL DEFAULT GETDATE(),
    updated_at          DATETIME2       NOT NULL DEFAULT GETDATE(),

    CONSTRAINT pk_users PRIMARY KEY (id),
    CONSTRAINT uq_users_email UNIQUE (email),
    CONSTRAINT fk_users_manager FOREIGN KEY (manager_id) REFERENCES users(id)
        ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX idx_users_role ON users (role);
CREATE INDEX idx_users_manager_id ON users (manager_id);
CREATE INDEX idx_users_is_active ON users (is_active);


-- Trigger for users.updated_at
CREATE TRIGGER trg_users_updated_at
ON users AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    UPDATE u SET updated_at = GETDATE()
    FROM users u INNER JOIN inserted i ON u.id = i.id;
END;


-- ================================================================
-- 2. CUSTOMERS
-- ================================================================
CREATE TABLE customers (
    id                  INT             NOT NULL IDENTITY(1,1),
    created_by          INT             NOT NULL,
    business_name       VARCHAR(255)    NOT NULL,
    owner_name          VARCHAR(150)    NOT NULL,
    business_phone      VARCHAR(30)     NOT NULL,
    owner_phone         VARCHAR(30)     NULL,
    email               VARCHAR(150)    NULL,
    business_address    VARCHAR(MAX)    NULL,
    postcode            VARCHAR(15)     NULL,
    utility_type        VARCHAR(15)     NOT NULL DEFAULT 'electricity'
                        CHECK (utility_type IN ('electricity','gas','both')),
    created_at          DATETIME2       NOT NULL DEFAULT GETDATE(),
    updated_at          DATETIME2       NOT NULL DEFAULT GETDATE(),

    CONSTRAINT pk_customers PRIMARY KEY (id),
    CONSTRAINT fk_customers_agent FOREIGN KEY (created_by) REFERENCES users(id)
        ON DELETE NO ACTION ON UPDATE CASCADE
);
CREATE INDEX idx_customers_created_by ON customers (created_by);
CREATE INDEX idx_customers_utility_type ON customers (utility_type);
CREATE INDEX idx_customers_business ON customers (business_name);


CREATE TRIGGER trg_customers_updated_at
ON customers AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    UPDATE c SET updated_at = GETDATE()
    FROM customers c INNER JOIN inserted i ON c.id = i.id;
END;


-- ================================================================
-- 3. ELECTRICITY METERS
-- ================================================================
CREATE TABLE electricity_meters (
    id                  INT             NOT NULL IDENTITY(1,1),
    customer_id         INT             NOT NULL,
    meter_number        TINYINT         NOT NULL DEFAULT 1,
    current_supplier    VARCHAR(150)    NULL,
    supply_number       VARCHAR(100)    NULL,
    meter_serial        VARCHAR(100)    NULL,
    meter_type          VARCHAR(15)     NOT NULL DEFAULT 'standard'
                        CHECK (meter_type IN ('standard','day_night','half_hourly')),
    day_unit_rate       DECIMAL(8,4)    NULL,
    night_unit_rate     DECIMAL(8,4)    NULL,
    evening_unit_rate   DECIMAL(8,4)    NULL,
    standing_rate       DECIMAL(8,4)    NULL,
    monthly_bill        DECIMAL(10,2)   NULL,
    contract_end_date   DATE            NULL,
    created_at          DATETIME2       NOT NULL DEFAULT GETDATE(),
    updated_at          DATETIME2       NOT NULL DEFAULT GETDATE(),

    CONSTRAINT pk_electricity_meters PRIMARY KEY (id),
    CONSTRAINT fk_elec_meters_customer FOREIGN KEY (customer_id) REFERENCES customers(id)
        ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX idx_elec_customer_id ON electricity_meters (customer_id);
CREATE INDEX idx_elec_supply_no ON electricity_meters (supply_number);


CREATE TRIGGER trg_electricity_meters_updated_at
ON electricity_meters AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    UPDATE e SET updated_at = GETDATE()
    FROM electricity_meters e INNER JOIN inserted i ON e.id = i.id;
END;


-- ================================================================
-- 4. GAS METERS
-- ================================================================
CREATE TABLE gas_meters (
    id                  INT             NOT NULL IDENTITY(1,1),
    customer_id         INT             NOT NULL,
    meter_number        TINYINT         NOT NULL DEFAULT 1,
    current_supplier    VARCHAR(150)    NULL,
    mprn                VARCHAR(100)    NULL,
    meter_serial        VARCHAR(100)    NULL,
    unit_rate           DECIMAL(8,4)    NULL,
    standing_rate       DECIMAL(8,4)    NULL,
    monthly_bill        DECIMAL(10,2)   NULL,
    contract_end_date   DATE            NULL,
    created_at          DATETIME2       NOT NULL DEFAULT GETDATE(),
    updated_at          DATETIME2       NOT NULL DEFAULT GETDATE(),

    CONSTRAINT pk_gas_meters PRIMARY KEY (id),
    CONSTRAINT fk_gas_meters_customer FOREIGN KEY (customer_id) REFERENCES customers(id)
        ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX idx_gas_customer_id ON gas_meters (customer_id);
CREATE INDEX idx_gas_mprn ON gas_meters (mprn);


CREATE TRIGGER trg_gas_meters_updated_at
ON gas_meters AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    UPDATE g SET updated_at = GETDATE()
    FROM gas_meters g INNER JOIN inserted i ON g.id = i.id;
END;


-- ================================================================
-- 5. CALL_BACKS — PIPELINE STAGE 1
-- ================================================================
CREATE TABLE call_backs (
    id                          INT             NOT NULL IDENTITY(1,1),
    employee_id                 INT             NOT NULL,
    customer_id                 INT             NOT NULL,
    created_by_manager_id       INT             NULL,
    scheduled_datetime          DATETIME2       NOT NULL,
    status                      VARCHAR(15)     NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending','done','overdue','cancelled','not_interested')),
    outcome                     VARCHAR(20)     NULL
                                CHECK (outcome IN ('interested','not_interested','no_answer','rescheduled','converted')),
    not_interested_reason       VARCHAR(MAX)    NULL,
    notes                       VARCHAR(MAX)    NULL,

    -- Offered Electricity Rates
    elec_offer_contract_length  VARCHAR(20)     NULL,
    elec_offer_supplier         VARCHAR(150)    NULL,
    elec_offer_meter_type       VARCHAR(15)     NULL
                                CHECK (elec_offer_meter_type IN ('standard','day_night','half_hourly')),
    elec_offer_commission_type  VARCHAR(20)     NULL
                                CHECK (elec_offer_commission_type IN ('commission','non_commission')),
    elec_commission_day_rate    DECIMAL(8,4)    NULL,
    elec_commission_night_rate  DECIMAL(8,4)    NULL,
    elec_commission_evening_rate DECIMAL(8,4)   NULL,
    elec_commission_standing    DECIMAL(8,4)    NULL,
    elec_noncom_day_rate        DECIMAL(8,4)    NULL,
    elec_noncom_night_rate      DECIMAL(8,4)    NULL,
    elec_noncom_evening_rate    DECIMAL(8,4)    NULL,
    elec_noncom_standing        DECIMAL(8,4)    NULL,
    elec_broker_charge          DECIMAL(10,2)   NULL,

    -- Offered Gas Rates
    gas_offer_contract_length   VARCHAR(20)     NULL,
    gas_offer_supplier          VARCHAR(150)    NULL,
    gas_commission_unit_rate    DECIMAL(8,4)    NULL,
    gas_commission_standing     DECIMAL(8,4)    NULL,
    gas_noncom_unit_rate        DECIMAL(8,4)    NULL,
    gas_noncom_standing         DECIMAL(8,4)    NULL,
    gas_broker_charge           DECIMAL(10,2)   NULL,

    completed_at                DATETIME2       NULL,
    created_at                  DATETIME2       NOT NULL DEFAULT GETDATE(),
    updated_at                  DATETIME2       NOT NULL DEFAULT GETDATE(),

    CONSTRAINT pk_call_backs PRIMARY KEY (id),
    CONSTRAINT fk_callbacks_employee FOREIGN KEY (employee_id) REFERENCES users(id)
        ON DELETE NO ACTION ON UPDATE CASCADE,
    CONSTRAINT fk_callbacks_customer FOREIGN KEY (customer_id) REFERENCES customers(id)
        ON DELETE NO ACTION ON UPDATE CASCADE,
    CONSTRAINT fk_callbacks_manager FOREIGN KEY (created_by_manager_id) REFERENCES users(id)
        ON DELETE NO ACTION ON UPDATE NO ACTION
);
CREATE INDEX idx_cb_employee_id ON call_backs (employee_id);
CREATE INDEX idx_cb_customer_id ON call_backs (customer_id);
CREATE INDEX idx_cb_status ON call_backs (status);
CREATE INDEX idx_cb_scheduled ON call_backs (scheduled_datetime);
CREATE INDEX idx_cb_employee_status ON call_backs (employee_id, status);
CREATE INDEX idx_cb_employee_scheduled ON call_backs (employee_id, scheduled_datetime);


CREATE TRIGGER trg_call_backs_updated_at
ON call_backs AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    UPDATE cb SET updated_at = GETDATE()
    FROM call_backs cb INNER JOIN inserted i ON cb.id = i.id;
END;


-- ================================================================
-- 6. TRANSFERS — PIPELINE STAGE 2
-- ================================================================
CREATE TABLE transfers (
    id                          INT             NOT NULL IDENTITY(1,1),
    employee_id                 INT             NOT NULL,
    customer_id                 INT             NOT NULL,
    call_back_id                INT             NULL,
    utility_type                VARCHAR(15)     NOT NULL DEFAULT 'electricity'
                                CHECK (utility_type IN ('electricity','gas','both')),
    status                      VARCHAR(20)     NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending','in_progress','sale_complete','cancelled','approved','rejected','dispute','completed','failed','chasing','cotInProgress','hold','not_interested')),
    outcome                     VARCHAR(20)     NULL,
    not_interested_reason       VARCHAR(MAX)    NULL,
    scheduled_datetime          DATETIME2       NULL,

    -- Utility Identifiers
    account_number              VARCHAR(50)     NULL,
    mpan                        VARCHAR(50)     NULL,
    mprn                        VARCHAR(50)     NULL,
    msn                         VARCHAR(50)     NULL,

    -- Confirmed Electricity Rates
    elec_offer_contract_length  VARCHAR(20)     NULL,
    elec_offer_supplier         VARCHAR(150)    NULL,
    elec_offer_meter_type       VARCHAR(15)     NULL
                                CHECK (elec_offer_meter_type IN ('standard','day_night','half_hourly')),
    elec_offer_commission_type  VARCHAR(20)     NULL
                                CHECK (elec_offer_commission_type IN ('commission','non_commission')),
    elec_commission_day_rate    DECIMAL(8,4)    NULL,
    elec_commission_night_rate  DECIMAL(8,4)    NULL,
    elec_commission_evening_rate DECIMAL(8,4)   NULL,
    elec_commission_standing    DECIMAL(8,4)    NULL,
    elec_noncom_day_rate        DECIMAL(8,4)    NULL,
    elec_noncom_night_rate      DECIMAL(8,4)    NULL,
    elec_noncom_evening_rate    DECIMAL(8,4)    NULL,
    elec_noncom_standing        DECIMAL(8,4)    NULL,
    elec_broker_charge          DECIMAL(10,2)   NULL,

    -- Confirmed Gas Rates
    gas_offer_contract_length   VARCHAR(20)     NULL,
    gas_offer_supplier          VARCHAR(150)    NULL,
    gas_commission_unit_rate    DECIMAL(8,4)    NULL,
    gas_commission_standing     DECIMAL(8,4)    NULL,
    gas_noncom_unit_rate        DECIMAL(8,4)    NULL,
    gas_noncom_standing         DECIMAL(8,4)    NULL,
    gas_broker_charge           DECIMAL(10,2)   NULL,

    notes                       VARCHAR(MAX)    NULL,
    completed_at                DATETIME2       NULL,
    created_at                  DATETIME2       NOT NULL DEFAULT GETDATE(),
    updated_at                  DATETIME2       NOT NULL DEFAULT GETDATE(),

    CONSTRAINT pk_transfers PRIMARY KEY (id),
    CONSTRAINT fk_transfers_employee FOREIGN KEY (employee_id) REFERENCES users(id)
        ON DELETE NO ACTION ON UPDATE CASCADE,
    CONSTRAINT fk_transfers_customer FOREIGN KEY (customer_id) REFERENCES customers(id)
        ON DELETE NO ACTION ON UPDATE CASCADE,
    CONSTRAINT fk_transfers_callback FOREIGN KEY (call_back_id) REFERENCES call_backs(id)
        ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX idx_tr_employee_id ON transfers (employee_id);
CREATE INDEX idx_tr_customer_id ON transfers (customer_id);
CREATE INDEX idx_tr_callback_id ON transfers (call_back_id);
CREATE INDEX idx_tr_status ON transfers (status);
CREATE INDEX idx_tr_employee_status ON transfers (employee_id, status);
CREATE INDEX idx_tr_mpan ON transfers (mpan);
CREATE INDEX idx_tr_mprn ON transfers (mprn);


CREATE TRIGGER trg_transfers_updated_at
ON transfers AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    UPDATE t SET updated_at = GETDATE()
    FROM transfers t INNER JOIN inserted i ON t.id = i.id;
END;


-- ================================================================
-- 7. SALES — PIPELINE STAGE 3
-- ================================================================
CREATE TABLE sales (
    id                      INT             NOT NULL IDENTITY(1,1),
    employee_id             INT             NOT NULL,
    customer_id             INT             NOT NULL,
    transfer_id             INT             NULL,

    -- Personal Details
    owner_full_name         VARCHAR(150)    NULL,
    home_address            VARCHAR(MAX)    NULL,
    date_of_birth           DATE            NULL,

    -- Business Details
    business_type           VARCHAR(20)     NULL
                            CHECK (business_type IN ('sole_trader','partnership','limited_company','plc')),
    bill_frequency          VARCHAR(10)     NOT NULL DEFAULT 'monthly'
                            CHECK (bill_frequency IN ('monthly','quarterly')),

    -- Payment Details
    payment_method          VARCHAR(15)     NOT NULL DEFAULT 'direct_debit'
                            CHECK (payment_method IN ('direct_debit','bank_transfer','bank_details','cheque','cash')),
    bank_name               VARCHAR(150)    NULL,
    account_type            VARCHAR(50)     NULL,
    account_title           VARCHAR(150)    NULL,
    sort_code               VARCHAR(10)     NULL,
    bank_account_number     VARCHAR(20)     NULL,

    -- COT Tracking
    cot_status              VARCHAR(20)     NOT NULL DEFAULT 'submitted'
                            CHECK (cot_status IN ('submitted','chasing','cot_in_progress','cot_complete','done','hold')),
    cot_date                DATE            NULL,
    cot_notes               VARCHAR(MAX)    NULL,

    -- Commission
    commission_amount       DECIMAL(10,2)   NOT NULL DEFAULT 0.00,

    notes                   VARCHAR(MAX)    NULL,
    created_at              DATETIME2       NOT NULL DEFAULT GETDATE(),
    updated_at              DATETIME2       NOT NULL DEFAULT GETDATE(),

    CONSTRAINT pk_sales PRIMARY KEY (id),
    CONSTRAINT fk_sales_employee FOREIGN KEY (employee_id) REFERENCES users(id)
        ON DELETE NO ACTION ON UPDATE CASCADE,
    CONSTRAINT fk_sales_customer FOREIGN KEY (customer_id) REFERENCES customers(id)
        ON DELETE NO ACTION ON UPDATE CASCADE,
    CONSTRAINT fk_sales_transfer FOREIGN KEY (transfer_id) REFERENCES transfers(id)
        ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX idx_sales_employee_id ON sales (employee_id);
CREATE INDEX idx_sales_customer_id ON sales (customer_id);
CREATE INDEX idx_sales_transfer_id ON sales (transfer_id);
CREATE INDEX idx_sales_cot_status ON sales (cot_status);
CREATE INDEX idx_sales_employee_cot ON sales (employee_id, cot_status);
CREATE INDEX idx_sales_created_at ON sales (created_at);


CREATE TRIGGER trg_sales_updated_at
ON sales AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    UPDATE s SET updated_at = GETDATE()
    FROM sales s INNER JOIN inserted i ON s.id = i.id;
END;


-- ================================================================
-- 8. ACTIVITY LOGS
-- ================================================================
CREATE TABLE activity_logs (
    id              BIGINT          NOT NULL IDENTITY(1,1),
    user_id         INT             NOT NULL,
    action          VARCHAR(100)    NOT NULL,
    entity_type     VARCHAR(50)     NULL,
    entity_id       INT             NULL,
    description     VARCHAR(MAX)    NULL,
    ip_address      VARCHAR(45)     NULL,
    created_at      DATETIME2       NOT NULL DEFAULT GETDATE(),

    CONSTRAINT pk_activity_logs PRIMARY KEY (id),
    CONSTRAINT fk_logs_user FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE NO ACTION ON UPDATE CASCADE
);
CREATE INDEX idx_logs_user_id ON activity_logs (user_id);
CREATE INDEX idx_logs_entity ON activity_logs (entity_type, entity_id);
CREATE INDEX idx_logs_action ON activity_logs (action);
CREATE INDEX idx_logs_created_at ON activity_logs (created_at);


-- ================================================================
-- 9. NOTIFICATIONS
-- ================================================================
CREATE TABLE notifications (
    id              INT             NOT NULL IDENTITY(1,1),
    user_id         INT             NOT NULL,
    type            VARCHAR(50)     NOT NULL,
    title           VARCHAR(255)    NOT NULL,
    body            VARCHAR(MAX)    NULL,
    entity_type     VARCHAR(50)     NULL,
    entity_id       INT             NULL,
    is_read         BIT             NOT NULL DEFAULT 0,
    read_at         DATETIME2       NULL,
    created_at      DATETIME2       NOT NULL DEFAULT GETDATE(),

    CONSTRAINT pk_notifications PRIMARY KEY (id),
    CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX idx_notif_user_unread ON notifications (user_id, is_read);
CREATE INDEX idx_notif_created_at ON notifications (created_at);

