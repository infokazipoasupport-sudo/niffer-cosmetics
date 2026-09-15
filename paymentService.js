export const paymentService = {
  async createIntent({ orderId, amount, provider = 'MANUAL' }) {
    return { orderId, amount, provider, status: 'PENDING', message: 'Payment provider credentials are not configured.' }
  },
}
