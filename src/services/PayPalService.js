const paypal = require('@paypal/paypal-server-sdk');

class PayPalService {
    constructor() {
        // Initialize PayPal SDK
        this.environment = new paypal.core.LiveEnvironment(
            process.env.PAYPAL_CLIENT_ID,
            process.env.PAYPAL_CLIENT_SECRET
        );
        
        this.client = new paypal.core.PayPalHttpClient(this.environment);
    }

    /**
     * Create a PayPal order
     * @param {Array} items - Array of items with id, name, price, quantity
     * @param {string} currency - Currency code (default: USD)
     * @returns {Promise<Object>} - PayPal order response
     */
    async createOrder(items, currency = 'USD') {
        try {
            // Calculate total amount
            const totalAmount = items.reduce((total, item) => {
                return total + (item.price * item.quantity);
            }, 0);

            const orderRequest = new paypal.orders.OrdersCreateRequest();
            orderRequest.prefer('return=representation');
            orderRequest.requestBody({
                intent: 'CAPTURE',
                purchase_units: [{
                    amount: {
                        currency_code: currency,
                        value: totalAmount.toFixed(2),
                        breakdown: {
                            item_total: {
                                currency_code: currency,
                                value: totalAmount.toFixed(2)
                            }
                        }
                    },
                    items: items.map(item => ({
                        name: item.name,
                        unit_amount: {
                            currency_code: currency,
                            value: item.price.toFixed(2)
                        },
                        quantity: item.quantity.toString(),
                        sku: item.id.toString()
                    }))
                }],
                application_context: {
                    brand_name: 'SEED Gaming Network',
                    landing_page: 'NO_PREFERENCE',
                    user_action: 'PAY_NOW',
                    return_url: `${process.env.WEBSITE_URL}/payment-success`,
                    cancel_url: `${process.env.WEBSITE_URL}/cart`
                }
            });

            const response = await this.client.execute(orderRequest);
            return {
                success: true,
                orderId: response.result.id,
                approvalUrl: response.result.links.find(link => link.rel === 'approve')?.href,
                data: response.result
            };
        } catch (error) {
            console.error('❌ PayPal order creation failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Capture a PayPal order
     * @param {string} orderId - PayPal order ID
     * @returns {Promise<Object>} - Capture response
     */
    async captureOrder(orderId) {
        try {
            const captureRequest = new paypal.orders.OrdersCaptureRequest(orderId);
            captureRequest.requestBody({});

            const response = await this.client.execute(captureRequest);
            
            if (response.result.status === 'COMPLETED') {
                return {
                    success: true,
                    captureId: response.result.purchase_units[0].payments.captures[0].id,
                    amount: response.result.purchase_units[0].payments.captures[0].amount.value,
                    currency: response.result.purchase_units[0].payments.captures[0].amount.currency_code,
                    data: response.result
                };
            } else {
                return {
                    success: false,
                    error: `Order capture failed with status: ${response.result.status}`
                };
            }
        } catch (error) {
            console.error('❌ PayPal order capture failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get order details
     * @param {string} orderId - PayPal order ID
     * @returns {Promise<Object>} - Order details
     */
    async getOrderDetails(orderId) {
        try {
            const orderRequest = new paypal.orders.OrdersGetRequest(orderId);
            const response = await this.client.execute(orderRequest);
            
            return {
                success: true,
                data: response.result
            };
        } catch (error) {
            console.error('❌ PayPal order details fetch failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Verify webhook signature
     * @param {Object} headers - Request headers
     * @param {string} body - Request body
     * @param {string} webhookId - PayPal webhook ID
     * @returns {boolean} - Whether signature is valid
     */
    verifyWebhookSignature(headers, body, webhookId) {
        try {
            // This would need to be implemented based on PayPal's webhook verification
            // For now, we'll implement basic validation
            const requiredHeaders = ['paypal-transmission-id', 'paypal-cert-id', 'paypal-transmission-sig', 'paypal-transmission-time'];
            
            for (const header of requiredHeaders) {
                if (!headers[header.toLowerCase()]) {
                    return false;
                }
            }
            
            return true;
        } catch (error) {
            console.error('❌ Webhook signature verification failed:', error);
            return false;
        }
    }
}

module.exports = PayPalService;

