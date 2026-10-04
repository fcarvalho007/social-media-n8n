/// <reference types="vite/client" />

// Side-effect CSS subpath imports (e.g. swiper/css) have no type declarations of their own.
declare module "swiper/css" {}
declare module "swiper/css/navigation" {}
declare module "swiper/css/pagination" {}
declare module "swiper/css/thumbs" {}
