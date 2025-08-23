// Shopify Buy Button: inject collection using domain/token/collectionId from data-attrs
(function(){
  const mount = document.getElementById('collection-component');
  if(!mount) return;
  const domain = mount.getAttribute('data-shopify-domain');
  const token = mount.getAttribute('data-shopify-token');
  const collectionId = mount.getAttribute('data-shopify-collection-id');
  if(!domain || !token || !collectionId){
    mount.innerHTML = '<div class="muted">Set SHOPIFY_DOMAIN, SHOPIFY_STOREFRONT_TOKEN, SHOPIFY_COLLECTION_ID in your Vercel env.</div>';
    return;
  }
  function loadScript() {
    const src = 'https://sdks.shopifycdn.com/buy-button/latest/buy-button-storefront.min.js';
    if (window.ShopifyBuy && window.ShopifyBuy.UI) return ShopifyBuyInit();
    const s = document.createElement('script'); s.async = true; s.src = src; s.onload = ShopifyBuyInit;
    document.head.appendChild(s);
  }
  function ShopifyBuyInit() {
    const client = ShopifyBuy.buildClient({ domain, storefrontAccessToken: token });
    ShopifyBuy.UI.onReady(client).then((ui) => {
      ui.createComponent('collection', {
        id: collectionId,
        node: mount,
        moneyFormat: '%24%7B%7Bamount%7D%7D',
        options: {
          product: { styles: { product: { 'max-width': '250px', 'margin': '10px' } }, buttonDestination: 'checkout', contents: { description: false } },
          cart: { startOpen: false },
          modalProduct: { contents: { img: true, button: true, buttonWithQuantity: false } }
        }
      });
    });
  }
  loadScript();
})();
