# Ocean Glass iOS — design system

Ocean Glass is the unified OceanHub visual language for the website and the native app shell. It is an ocean-inspired interpretation of Apple's Liquid Glass material: translucent layered surfaces, soft refraction-like blur, cool highlights, subtle depth and restrained motion. It is not a copy of Apple's interface.

## Global application

The Cloudflare Worker serves the website and the same remote HTML experience inside the Android and Windows app shells. The shared theme is injected by `injectOceanLiquidGlassTheme` from the Worker HTML response pipeline. This gives the website, account pages, community tools, marketplace, admin pages and Air Flow a consistent visual layer without changing route handlers, forms, API contracts or permission checks.

The native app's local launch fallback uses the same ocean-glass material when it is shown outside the hosted experience.

## Material tokens

| Token | Purpose |
| --- | --- |
| `--oh-ios-glass-soft` | Quiet translucent panels |
| `--oh-ios-glass-raised` | Floating and elevated surfaces |
| `--oh-ios-glass-edge` | Frosted-glass boundary |
| `--oh-ios-glass-edge-hot` | Interactive/hover edge |
| `--oh-ios-glass-shine` | Fine upper-edge highlight |
| `--oh-ios-glass-blur` | Default 28px glass blur |
| `--oh-ios-glass-radius` | Shared 25px glass radius |
| `--oh-ios-glass-shadow` | Depth and inset highlight |

## Component rules

- Navigation, toolbars, sidebars, menus and sheets use floating translucent surfaces.
- Cards, dialogs, notifications and Air Flow panels use the same material, radius and depth hierarchy.
- Controls stay clearly identifiable. Primary, secondary and destructive actions retain separate visual treatments.
- Inputs remain inset and readable; focus indicators are visible and not conveyed by color alone.
- Dark Ocean Glass is the default. `body.light` receives a frosted daylight variant with dark ink.
- Mobile layouts reduce blur and keep touch targets at least 44px high.
- Motion is decorative only and is removed when `prefers-reduced-motion` is enabled. Higher-contrast and forced-colors settings receive stronger focus/border treatment.
- Browsers without backdrop-filter support receive opaque, readable surface fallbacks.

## Scope and safety

The theme is a CSS-only presentation layer. It must not rewrite page markup, add dependencies, change routes, alter JavaScript behavior, modify authentication or permissions, or introduce storage/API calls. Keep Ocean Glass changes separate from release stabilization and deployment work. Production deployment remains an explicit release action.
