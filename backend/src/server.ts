import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import plaidRoutes from './routes/plaid'
import creditRoutes from './routes/credit'
import stripeRoutes from './routes/stripe'
import officerRoutes from './routes/officer'
import guarantorOtpRoutes from './routes/guarantorOtp'
import agreementRoutes from './routes/agreement'
import fraudRoutes from './routes/fraud'
import repaymentRoutes from './routes/repayment'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({
    origin: [
        'http://localhost:5173',
        'https://blueprints-vibercoderzz-x9cb.vercel.app'
    ],
    credentials: true
}))

app.use(express.json())

// Health check
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Routes
app.use('/api/plaid',       plaidRoutes)
app.use('/api/credit',      creditRoutes)
app.use('/api/stripe',      stripeRoutes)
app.use('/api/officer',     officerRoutes)
app.use('/api/guarantor',   guarantorOtpRoutes)   // F2 — Guarantor OTP
app.use('/api/agreement',   agreementRoutes)       // F5 — Digital agreement
app.use('/api/fraud',       fraudRoutes)           // F7 — Fraud detection
app.use('/api/repayment',   repaymentRoutes)       // F6 — EMI repayment

app.listen(PORT, () => {
    console.log(`✅ Nexus backend running on port ${PORT}`)
})

export default app