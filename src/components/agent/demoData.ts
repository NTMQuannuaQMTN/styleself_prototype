import linenBlazer from '../../assets/products/linen_blazer.webp'
import relaxedOvershirt from '../../assets/products/relaxed_overshirt.webp'
import tailoredJacket from '../../assets/products/jacket.webp'
import type { AgentLocation, AgentProduct } from './AgentWidget'

/**
 * Demo merchant used by the public /agent/:agentId route for the MVP. Later this
 * loads the real store + catalog by agentId.
 */
export const DEMO_STORE = {
  name: 'Urban Thread',
  agentName: 'StyleSelf',
  greeting: 'Hi — what are you shopping for today?',
  currency: 'USD',
}

export const DEMO_LOCATIONS: AgentLocation[] = [
  { id: 'orchard', name: 'Orchard' },
  { id: 'vivocity', name: 'VivoCity' },
  { id: 'jurong', name: 'Jurong East' },
]

export const DEMO_PRODUCTS: AgentProduct[] = [
  {
    id: 'linen-blazer',
    name: 'Linen Blazer',
    category: 'Jackets',
    description:
      'Relaxed-fit oatmeal linen blazer, half-lined, natural shoulder. Smart casual.',
    priceCents: 8900,
    imageUrl: linenBlazer,
    stockByLocation: { orchard: 4, vivocity: 2, jurong: 0 },
  },
  {
    id: 'relaxed-overshirt',
    name: 'Relaxed Overshirt',
    category: 'Shirts',
    description:
      'Lightweight taupe overshirt with chest pockets. Casual layering piece.',
    priceCents: 7200,
    imageUrl: relaxedOvershirt,
    stockByLocation: { orchard: 6, vivocity: 3, jurong: 5 },
  },
  {
    id: 'tailored-jacket',
    name: 'Tailored Jacket',
    category: 'Jackets',
    description:
      'Structured navy tailored jacket. Formal, dinner-ready, sharp shoulder.',
    priceCents: 12900,
    imageUrl: tailoredJacket,
    stockByLocation: { orchard: 2, vivocity: 1, jurong: 0 },
  },
  {
    id: 'oxford-shirt',
    name: 'Oxford Shirt',
    category: 'Shirts',
    description: 'Classic white cotton oxford. Works under a blazer or on its own.',
    priceCents: 4900,
    imageUrl: null,
    stockByLocation: { orchard: 12, vivocity: 8, jurong: 10 },
  },
  {
    id: 'wool-trousers',
    name: 'Wool Trousers',
    category: 'Trousers',
    description: 'Charcoal tapered wool trousers with a clean drape. Smart casual to formal.',
    priceCents: 9800,
    imageUrl: null,
    stockByLocation: { orchard: 5, vivocity: 4, jurong: 2 },
  },
]
