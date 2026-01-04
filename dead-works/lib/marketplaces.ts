export function openseaCollectionUrl(slug: string) {
  return `https://opensea.io/collection/${slug}`;
}

export function sudoswapBrowseUrl(chain: string, contractAddress: string) {
  // example: https://sudoswap.xyz/#/browse/ethereum/buy/0x...
  return `https://sudoswap.xyz/#/browse/${encodeURIComponent(chain)}/buy/${contractAddress}`;
}