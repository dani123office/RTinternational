export function PageContainer({ children, className = '' }) {
  return (
    <div className={`p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen ${className}`}>
      {children}
    </div>
  )
}

export function PageContainerNarrow({ children, className = '' }) {
  return (
    <PageContainer className={`max-w-3xl mx-auto ${className}`}>
      {children}
    </PageContainer>
  )
}

export function PageContainerWide({ children, className = '' }) {
  return (
    <PageContainer className={`max-w-5xl mx-auto ${className}`}>
      {children}
    </PageContainer>
  )
}
