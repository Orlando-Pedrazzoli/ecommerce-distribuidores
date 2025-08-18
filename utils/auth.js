import jwt from 'jsonwebtoken'

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.NEXTAUTH_SECRET)
  } catch (error) {
    return null
  }
}

export const requireAuth = (handler) => {
  return async (req, res) => {
    const token = req.cookies['auth-token']
    
    if (!token) {
      return res.status(401).json({ message: 'Token não fornecido' })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return res.status(401).json({ message: 'Token inválido' })
    }

    req.user = decoded
    return handler(req, res)
  }
}
