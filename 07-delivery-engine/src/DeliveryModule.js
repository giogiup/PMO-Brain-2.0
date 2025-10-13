class DeliveryModule {
  async deliver(newsletterContent) {
    console.log('Delivering newsletter:', JSON.stringify(newsletterContent, null, 2));
  }
}
module.exports = DeliveryModule;
