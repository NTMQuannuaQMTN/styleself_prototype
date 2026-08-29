import linenBlazer from '../../assets/products/linen_blazer.webp'
import relaxedOvershirt from '../../assets/products/relaxed_overshirt.webp'
import tailoredJacket from '../../assets/products/jacket.webp'

/** Mock catalog used by the landing-page conversation demos. */
export const DEMO_PRODUCTS = [
  {
    name: 'Linen Blazer',
    price: '$89',
    image: linenBlazer,
    alt: 'Oatmeal textured linen blazer, front view',
  },
  {
    name: 'Relaxed Overshirt',
    price: '$72',
    image: relaxedOvershirt,
    alt: 'Taupe relaxed-fit overshirt with chest pockets, front view',
  },
  {
    name: 'Tailored Jacket',
    price: '$129',
    image: tailoredJacket,
    alt: 'Navy tailored jacket with pocket square, front view',
  },
] as const
