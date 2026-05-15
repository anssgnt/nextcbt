export const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-lg shadow-sm border border-gray-100 p-4 ${className}`}>
    {children}
  </div>
)

export const CardHeader = ({ children, className = '' }) => (
  <div className={`mb-4 pb-3 border-b border-gray-100 ${className}`}>
    {children}
  </div>
)

export const CardBody = ({ children, className = '' }) => (
  <div className={className}>{children}</div>
)

export const CardFooter = ({ children, className = '' }) => (
  <div className={`mt-4 pt-3 border-t border-gray-100 ${className}`}>
    {children}
  </div>
)
