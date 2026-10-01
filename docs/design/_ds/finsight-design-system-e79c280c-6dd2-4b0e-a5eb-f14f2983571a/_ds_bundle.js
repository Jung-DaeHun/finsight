/* @ds-bundle: {"format":4,"namespace":"FinsightDesignSystem_e79c28","components":[{"name":"CampaignTile","sourcePath":"components/cards/CampaignTile.jsx"},{"name":"CategoryIconCard","sourcePath":"components/cards/CategoryIconCard.jsx"},{"name":"MemberBenefitCard","sourcePath":"components/cards/MemberBenefitCard.jsx"},{"name":"ProductCard","sourcePath":"components/cards/ProductCard.jsx"},{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Icon","sourcePath":"components/core/Icon.jsx"},{"name":"IconButton","sourcePath":"components/core/IconButton.jsx"},{"name":"PriceRow","sourcePath":"components/core/PriceRow.jsx"},{"name":"SwatchDot","sourcePath":"components/core/SwatchDot.jsx"},{"name":"DisclosureRow","sourcePath":"components/disclosure/DisclosureRow.jsx"},{"name":"FilterChip","sourcePath":"components/filters/FilterChip.jsx"},{"name":"FilterSidebar","sourcePath":"components/filters/FilterSidebar.jsx"},{"name":"SearchPill","sourcePath":"components/forms/SearchPill.jsx"},{"name":"Footer","sourcePath":"components/navigation/Footer.jsx"},{"name":"NavDrawer","sourcePath":"components/navigation/NavDrawer.jsx"},{"name":"PrimaryNav","sourcePath":"components/navigation/PrimaryNav.jsx"},{"name":"SubNav","sourcePath":"components/navigation/SubNav.jsx"},{"name":"UtilityBar","sourcePath":"components/navigation/UtilityBar.jsx"}],"sourceHashes":{"components/cards/CampaignTile.jsx":"66fc7a623260","components/cards/CategoryIconCard.jsx":"fb5de1b7c77a","components/cards/MemberBenefitCard.jsx":"2572caaa427b","components/cards/ProductCard.jsx":"d1843cf5950e","components/core/Badge.jsx":"4d6076fa68cb","components/core/Button.jsx":"ec5d34451866","components/core/Icon.jsx":"70429b129f48","components/core/IconButton.jsx":"b0f5c46ffbb1","components/core/PriceRow.jsx":"048f0fe7fffb","components/core/SwatchDot.jsx":"2c0b1059539d","components/disclosure/DisclosureRow.jsx":"29a04a2e18de","components/filters/FilterChip.jsx":"5325d997e0b3","components/filters/FilterSidebar.jsx":"2d80bb4e346b","components/forms/SearchPill.jsx":"31c8cf193a9d","components/navigation/Footer.jsx":"402721d8cb03","components/navigation/NavDrawer.jsx":"18b95f43e99f","components/navigation/PrimaryNav.jsx":"ef6d5eeffad0","components/navigation/SubNav.jsx":"62ae3e90d825","components/navigation/UtilityBar.jsx":"4cc80c1fbc87","ui_kits/website/Detail.jsx":"a4a65c7487a7","ui_kits/website/Home.jsx":"82e8cd32c8d3","ui_kits/website/Listing.jsx":"b93b0219f8cc","ui_kits/website/Membership.jsx":"085152e7b75f","ui_kits/website/data.jsx":"f78775bb2deb"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.FinsightDesignSystem_e79c28 = window.FinsightDesignSystem_e79c28 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Badge({
  children,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("span", _extends({}, rest, {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      padding: '4px 12px',
      background: 'var(--canvas)',
      border: '1px solid var(--hairline)',
      borderRadius: 'var(--radius-lg)',
      font: 'var(--type-caption-sm)',
      color: 'var(--ink)',
      whiteSpace: 'nowrap',
      ...style
    }
  }), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Icon.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const BASE = 'https://unpkg.com/lucide-static@0.460.0/icons/';
function Icon({
  name,
  size = 24,
  color = 'currentColor',
  style,
  ...rest
}) {
  const url = 'url(' + BASE + name + '.svg)';
  return /*#__PURE__*/React.createElement("span", _extends({
    "aria-hidden": "true"
  }, rest, {
    style: {
      display: 'inline-block',
      width: size,
      height: size,
      flex: 'none',
      backgroundColor: color,
      WebkitMask: url + ' center/contain no-repeat',
      mask: url + ' center/contain no-repeat',
      ...style
    }
  }));
}
Object.assign(__ds_scope, { Icon });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Icon.jsx", error: String((e && e.message) || e) }); }

// components/cards/CategoryIconCard.jsx
try { (() => {
function CategoryIconCard({
  icon,
  image,
  label,
  onClick,
  style
}) {
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onClick,
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 'var(--space-md)',
      padding: 'var(--space-xl) var(--space-sm)',
      border: 0,
      borderRadius: 0,
      background: 'var(--canvas)',
      cursor: 'pointer',
      color: 'var(--ink)',
      ...style
    }
  }, image ? /*#__PURE__*/React.createElement("img", {
    src: image,
    alt: "",
    style: {
      width: 88,
      height: 88,
      objectFit: 'contain'
    }
  }) : /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon || 'circle',
    size: 80,
    style: {
      opacity: 0.9
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-caption-md)',
      color: 'var(--ink)'
    }
  }, label));
}
Object.assign(__ds_scope, { CategoryIconCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/cards/CategoryIconCard.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const VARIANTS = {
  primary: {
    background: 'var(--cta-primary-bg)',
    color: 'var(--cta-primary-fg)'
  },
  secondary: {
    background: 'var(--cta-secondary-bg)',
    color: 'var(--cta-secondary-fg)'
  },
  'on-image': {
    background: 'var(--cta-on-image-bg)',
    color: 'var(--cta-on-image-fg)'
  }
};
const SIZES = {
  sm: {
    font: 'var(--type-button-sm)',
    height: 36,
    padding: '0 16px',
    gap: 6,
    icon: 16
  },
  md: {
    font: 'var(--type-button-md)',
    height: 48,
    padding: '0 32px',
    gap: 8,
    icon: 20
  },
  lg: {
    font: 'var(--type-button-lg)',
    height: 64,
    padding: '0 40px',
    gap: 10,
    icon: 24
  }
};
function Button({
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  fullWidth = false,
  disabled = false,
  children,
  style,
  onClick,
  type = 'button',
  ...rest
}) {
  const [pressed, setPressed] = React.useState(false);
  const v = VARIANTS[variant] || VARIANTS.primary,
    s = SIZES[size] || SIZES.md;
  const pad = variant === 'on-image' && size === 'md' ? '0 24px' : s.padding;
  const up = () => setPressed(false);
  return /*#__PURE__*/React.createElement("button", _extends({
    type: type,
    disabled: disabled,
    onClick: onClick,
    onPointerDown: () => !disabled && setPressed(true),
    onPointerUp: up,
    onPointerLeave: up
  }, rest, {
    style: {
      display: fullWidth ? 'flex' : 'inline-flex',
      width: fullWidth ? '100%' : undefined,
      boxSizing: 'border-box',
      alignItems: 'center',
      justifyContent: 'center',
      gap: s.gap,
      height: s.height,
      padding: pad,
      border: 0,
      borderRadius: 'var(--radius-lg)',
      font: s.font,
      whiteSpace: 'nowrap',
      cursor: disabled ? 'not-allowed' : 'pointer',
      ...v,
      ...(disabled ? {
        background: 'var(--hairline-soft)',
        color: 'var(--stone)'
      } : null),
      transform: pressed ? 'scale(var(--press-scale))' : 'none',
      opacity: pressed ? 'var(--press-opacity)' : 1,
      transition: 'transform var(--dur-press) var(--ease-standard),opacity var(--dur-press) var(--ease-standard)',
      ...style
    }
  }), icon && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: s.icon
  }), children, iconRight && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: iconRight,
    size: s.icon
  }));
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/cards/CampaignTile.jsx
try { (() => {
function CampaignTile({
  image,
  headline,
  body,
  ctaLabel,
  onCta,
  secondaryCtaLabel,
  onSecondaryCta,
  tone = 'light',
  align = 'bottom-left',
  aspectRatio = '16 / 9',
  minHeight,
  style
}) {
  const fg = tone === 'light' ? 'var(--canvas)' : 'var(--ink)';
  const fallback = tone === 'light' ? 'var(--charcoal)' : 'var(--soft-cloud)';
  return /*#__PURE__*/React.createElement("section", {
    style: {
      position: 'relative',
      aspectRatio,
      minHeight,
      overflow: 'hidden',
      background: fallback,
      ...style
    }
  }, image && /*#__PURE__*/React.createElement("img", {
    src: image,
    alt: "",
    style: {
      position: 'absolute',
      inset: 0,
      width: '100%',
      height: '100%',
      objectFit: 'cover'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: align === 'top-left' ? 'flex-start' : 'flex-end',
      alignItems: 'flex-start',
      gap: 'var(--space-xl)',
      padding: 'var(--space-section)',
      boxSizing: 'border-box'
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      font: 'var(--type-display-campaign)',
      letterSpacing: 'var(--display-letter-spacing)',
      textTransform: 'uppercase',
      whiteSpace: 'pre-line',
      color: fg
    }
  }, headline), body && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      maxWidth: 520,
      font: 'var(--type-body-md)',
      color: fg
    }
  }, body), (ctaLabel || secondaryCtaLabel) && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-sm)',
      flexWrap: 'wrap'
    }
  }, ctaLabel && /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: tone === 'light' ? 'on-image' : 'primary',
    onClick: onCta
  }, ctaLabel), secondaryCtaLabel && /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "on-image",
    onClick: onSecondaryCta
  }, secondaryCtaLabel))));
}
Object.assign(__ds_scope, { CampaignTile });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/cards/CampaignTile.jsx", error: String((e && e.message) || e) }); }

// components/cards/MemberBenefitCard.jsx
try { (() => {
function MemberBenefitCard({
  image,
  title,
  ctaLabel = 'Explore',
  onCta,
  aspectRatio = '4 / 5',
  style
}) {
  return /*#__PURE__*/React.createElement("article", {
    style: {
      position: 'relative',
      aspectRatio,
      overflow: 'hidden',
      background: 'var(--charcoal)',
      ...style
    }
  }, image && /*#__PURE__*/React.createElement("img", {
    src: image,
    alt: "",
    style: {
      position: 'absolute',
      inset: 0,
      width: '100%',
      height: '100%',
      objectFit: 'cover'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: 'var(--space-lg)',
      padding: 'var(--space-xxl)'
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0,
      font: 'var(--type-heading-lg)',
      color: 'var(--on-primary)'
    }
  }, title), /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "on-image",
    onClick: onCta
  }, ctaLabel)));
}
Object.assign(__ds_scope, { MemberBenefitCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/cards/MemberBenefitCard.jsx", error: String((e && e.message) || e) }); }

// components/core/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const BG = {
  soft: ['var(--soft-cloud)', 'var(--ink)'],
  ghost: ['transparent', 'var(--ink)'],
  canvas: ['var(--canvas)', 'var(--ink)'],
  inverse: ['var(--ink)', 'var(--on-primary)']
};
function IconButton({
  icon,
  label,
  variant = 'soft',
  size = 40,
  onClick,
  style,
  ...rest
}) {
  const [pressed, setPressed] = React.useState(false);
  const [bg, fg] = BG[variant] || BG.soft;
  const up = () => setPressed(false);
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    "aria-label": label,
    title: label,
    onClick: onClick,
    onPointerDown: () => setPressed(true),
    onPointerUp: up,
    onPointerLeave: up
  }, rest, {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flex: 'none',
      width: size,
      height: size,
      padding: 0,
      border: 0,
      borderRadius: 'var(--radius-full)',
      background: bg,
      color: fg,
      cursor: 'pointer',
      opacity: pressed ? 'var(--press-opacity)' : 1,
      transition: 'opacity var(--dur-fast) var(--ease-standard)',
      ...style
    }
  }), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: Math.round(size * 0.6)
  }));
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/core/PriceRow.jsx
try { (() => {
function PriceRow({
  price,
  originalPrice,
  discount,
  size = 'md',
  style
}) {
  const font = size === 'lg' ? 'var(--type-heading-lg)' : 'var(--type-body-strong)';
  if (!originalPrice) return /*#__PURE__*/React.createElement("div", {
    style: {
      font,
      color: 'var(--ink)',
      ...style
    }
  }, price);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'baseline',
      columnGap: 8,
      font,
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--sale)'
    }
  }, price), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--mute)',
      textDecoration: 'line-through'
    }
  }, originalPrice), discount && /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--sale)'
    }
  }, discount));
}
Object.assign(__ds_scope, { PriceRow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/PriceRow.jsx", error: String((e && e.message) || e) }); }

// components/core/SwatchDot.jsx
try { (() => {
function isLight(c) {
  const m = /^#?([0-9a-f]{6})$/i.exec(c || '');
  if (!m) return false;
  const n = parseInt(m[1], 16);
  const r = n >> 16,
    g = n >> 8 & 255,
    b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 225;
}
function SwatchDot({
  color,
  active = false,
  size = 12,
  label,
  onClick,
  style
}) {
  const ring = active ? 'var(--swatch-ring-active)' : isLight(color) ? 'var(--swatch-ring-light)' : 'none';
  const s = {
    display: 'inline-block',
    flex: 'none',
    width: size,
    height: size,
    padding: 0,
    border: 0,
    borderRadius: 'var(--radius-full)',
    background: color,
    boxShadow: ring,
    cursor: onClick ? 'pointer' : 'default',
    ...style
  };
  return onClick ? /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": label || color,
    "aria-pressed": active,
    onClick: onClick,
    style: s
  }) : /*#__PURE__*/React.createElement("span", {
    "aria-label": label,
    style: s
  });
}
Object.assign(__ds_scope, { SwatchDot });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/SwatchDot.jsx", error: String((e && e.message) || e) }); }

// components/cards/ProductCard.jsx
try { (() => {
function ProductCard({
  image,
  imageAlt = '',
  placeholder,
  name,
  subtitle,
  colorCount,
  price,
  originalPrice,
  discount,
  badge,
  swatches,
  aspectRatio = '1 / 1',
  onClick,
  style
}) {
  const [sel, setSel] = React.useState(0);
  return /*#__PURE__*/React.createElement("article", {
    onClick: onClick,
    style: {
      display: 'flex',
      flexDirection: 'column',
      minWidth: 0,
      background: 'var(--canvas)',
      cursor: onClick ? 'pointer' : 'default',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      aspectRatio,
      background: 'var(--surface-product)',
      overflow: 'hidden'
    }
  }, image ? /*#__PURE__*/React.createElement("img", {
    src: image,
    alt: imageAlt,
    style: {
      position: 'absolute',
      inset: 0,
      width: '100%',
      height: '100%',
      objectFit: 'cover'
    }
  }) : placeholder ? /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      font: 'var(--type-caption-md)',
      color: 'var(--stone)'
    }
  }, placeholder) : null, badge && /*#__PURE__*/React.createElement(__ds_scope.Badge, {
    style: {
      position: 'absolute',
      top: 12,
      left: 12
    }
  }, badge)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-sm)',
      paddingTop: 'var(--space-md)'
    }
  }, swatches && swatches.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      padding: '4px'
    }
  }, swatches.map((c, i) => /*#__PURE__*/React.createElement(__ds_scope.SwatchDot, {
    key: i,
    color: c,
    active: i === sel,
    onClick: e => {
      e.stopPropagation();
      setSel(i);
    }
  }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-body-strong)',
      color: 'var(--ink)'
    }
  }, name), subtitle && /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-caption-md)',
      color: 'var(--mute)'
    }
  }, subtitle), colorCount && /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-caption-md)',
      color: 'var(--mute)'
    }
  }, colorCount)), price && /*#__PURE__*/React.createElement(__ds_scope.PriceRow, {
    price: price,
    originalPrice: originalPrice,
    discount: discount
  })));
}
Object.assign(__ds_scope, { ProductCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/cards/ProductCard.jsx", error: String((e && e.message) || e) }); }

// components/disclosure/DisclosureRow.jsx
try { (() => {
function DisclosureRow({
  label,
  count,
  variant = 'pdp',
  defaultOpen = false,
  children,
  style
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      borderBottom: '1px solid var(--hairline)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-expanded": open,
    onClick: () => setOpen(o => !o),
    style: {
      display: 'flex',
      width: '100%',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 'var(--space-md)',
      padding: 'var(--space-xl) 0',
      border: 0,
      background: 'none',
      cursor: 'pointer',
      textAlign: 'left',
      font: variant === 'faq' ? 'var(--type-heading-md)' : 'var(--type-body-strong)',
      color: 'var(--ink)'
    }
  }, /*#__PURE__*/React.createElement("span", null, label, count != null && ' (' + count + ')'), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevron-down",
    size: 24,
    style: {
      transform: open ? 'rotate(180deg)' : 'none',
      transition: 'transform var(--dur-fast) var(--ease-standard)'
    }
  })), open && /*#__PURE__*/React.createElement("div", {
    style: {
      paddingBottom: 'var(--space-xl)',
      font: 'var(--type-body-md)',
      color: 'var(--charcoal)'
    }
  }, children));
}
Object.assign(__ds_scope, { DisclosureRow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/disclosure/DisclosureRow.jsx", error: String((e && e.message) || e) }); }

// components/filters/FilterChip.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function FilterChip({
  active = false,
  children,
  onClick,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    "aria-pressed": active,
    onClick: onClick
  }, rest, {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      boxSizing: 'border-box',
      height: 40,
      padding: '8px 16px',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid ' + (active ? 'var(--ink)' : 'var(--hairline)'),
      background: active ? 'var(--ink)' : 'var(--canvas)',
      color: active ? 'var(--on-primary)' : 'var(--ink)',
      font: 'var(--type-button-md)',
      whiteSpace: 'nowrap',
      cursor: 'pointer',
      ...style
    }
  }), children);
}
Object.assign(__ds_scope, { FilterChip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/filters/FilterChip.jsx", error: String((e && e.message) || e) }); }

// components/filters/FilterSidebar.jsx
try { (() => {
function FilterSidebar({
  groups = [],
  onToggle,
  width = 220,
  style
}) {
  const [closed, setClosed] = React.useState({});
  return /*#__PURE__*/React.createElement("aside", {
    style: {
      width,
      flex: 'none',
      background: 'var(--canvas)',
      ...style
    }
  }, groups.map((g, gi) => {
    const open = !closed[gi];
    return /*#__PURE__*/React.createElement("div", {
      key: gi,
      style: {
        borderTop: gi ? '1px solid var(--hairline)' : 'none',
        padding: 'var(--space-lg) 0'
      }
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: () => setClosed(c => ({
        ...c,
        [gi]: open
      })),
      style: {
        display: 'flex',
        width: '100%',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 0,
        border: 0,
        background: 'none',
        cursor: 'pointer',
        font: 'var(--type-body-strong)',
        color: 'var(--ink)'
      }
    }, /*#__PURE__*/React.createElement("span", null, g.title, g.selected ? /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--mute)'
      }
    }, " (", g.selected, ")") : null), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: "chevron-down",
      size: 20,
      style: {
        transform: open ? 'rotate(180deg)' : 'none',
        transition: 'transform var(--dur-fast)'
      }
    })), open && /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-sm)',
        marginTop: 'var(--space-md)'
      }
    }, g.options.map((o, oi) => /*#__PURE__*/React.createElement("button", {
      key: oi,
      type: "button",
      onClick: () => onToggle && onToggle(gi, oi),
      style: {
        alignSelf: 'flex-start',
        padding: 0,
        border: 0,
        background: 'none',
        cursor: 'pointer',
        textAlign: 'left',
        font: 'var(--type-body-md)',
        color: 'var(--ink)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        textDecoration: o.active ? 'underline' : 'none',
        textDecorationThickness: 1,
        textUnderlineOffset: 4
      }
    }, o.label), o.count != null && /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--mute)'
      }
    }, " (", o.count, ")")))));
  }));
}
Object.assign(__ds_scope, { FilterSidebar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/filters/FilterSidebar.jsx", error: String((e && e.message) || e) }); }

// components/forms/SearchPill.jsx
try { (() => {
function SearchPill({
  value,
  defaultValue,
  placeholder = 'Search',
  onChange,
  onSubmit,
  width = 180,
  collapsed = false,
  onExpand,
  autoFocus,
  style
}) {
  const [focus, setFocus] = React.useState(false);
  const [inner, setInner] = React.useState(defaultValue || '');
  const val = value !== undefined ? value : inner;
  if (collapsed) return /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    icon: "search",
    label: "Search",
    variant: "ghost",
    onClick: onExpand
  });
  return /*#__PURE__*/React.createElement("form", {
    role: "search",
    onSubmit: e => {
      e.preventDefault();
      onSubmit && onSubmit(val);
    },
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      boxSizing: 'border-box',
      width,
      height: 40,
      padding: '8px 16px 8px 6px',
      borderRadius: 'var(--radius-md)',
      background: focus ? 'var(--canvas)' : 'var(--soft-cloud)',
      border: '2px solid ' + (focus ? 'var(--ink)' : 'transparent'),
      boxShadow: focus ? 'var(--focus-halo)' : 'none',
      transition: 'background var(--dur-fast),box-shadow var(--dur-fast)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "submit",
    "aria-label": "Submit search",
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 28,
      height: 28,
      padding: 0,
      border: 0,
      borderRadius: 'var(--radius-md)',
      background: 'transparent',
      color: 'var(--ink)',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "search",
    size: 22
  })), /*#__PURE__*/React.createElement("input", {
    value: val,
    autoFocus: autoFocus,
    placeholder: placeholder,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    onChange: e => {
      setInner(e.target.value);
      onChange && onChange(e.target.value);
    },
    style: {
      flex: 1,
      minWidth: 0,
      padding: 0,
      border: 0,
      outline: 0,
      background: 'transparent',
      font: 'var(--type-body-md)',
      color: 'var(--ink)'
    }
  }));
}
Object.assign(__ds_scope, { SearchPill });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/SearchPill.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Footer.jsx
try { (() => {
function Footer({
  columns = [],
  legal = [],
  copyright,
  locale,
  onLink,
  style
}) {
  const link = {
    padding: 0,
    border: 0,
    background: 'none',
    cursor: 'pointer',
    textAlign: 'left',
    font: 'var(--type-caption-md)',
    color: 'var(--mute)'
  };
  return /*#__PURE__*/React.createElement("footer", {
    style: {
      background: 'var(--canvas)',
      borderTop: '1px solid var(--hairline)',
      padding: 'var(--space-section) var(--gutter) var(--space-xl)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))',
      gap: 'var(--space-xl)'
    }
  }, columns.map(c => /*#__PURE__*/React.createElement("div", {
    key: c.title,
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-md)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-body-strong)',
      color: 'var(--ink)'
    }
  }, c.title), c.links.map(l => /*#__PURE__*/React.createElement("button", {
    key: l,
    type: "button",
    onClick: () => onLink && onLink(l),
    style: link
  }, l))))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'var(--space-section)',
      paddingTop: 'var(--space-lg)',
      borderTop: '1px solid var(--hairline)',
      display: 'flex',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      gap: 'var(--space-md)',
      font: 'var(--type-utility-xs)',
      color: 'var(--mute)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-xl)'
    }
  }, locale && /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--ink)'
    }
  }, locale), copyright && /*#__PURE__*/React.createElement("span", null, copyright)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 'var(--space-xl)'
    }
  }, legal.map(l => /*#__PURE__*/React.createElement("button", {
    key: l,
    type: "button",
    onClick: () => onLink && onLink(l),
    style: {
      ...link,
      font: 'inherit'
    }
  }, l)))));
}
Object.assign(__ds_scope, { Footer });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Footer.jsx", error: String((e && e.message) || e) }); }

// components/navigation/NavDrawer.jsx
try { (() => {
function NavDrawer({
  open,
  onClose,
  links = [],
  onNavigate,
  footer = true,
  contained = false,
  style
}) {
  const pos = contained ? 'absolute' : 'fixed';
  return /*#__PURE__*/React.createElement("div", {
    "aria-hidden": !open,
    style: {
      position: pos,
      inset: 0,
      zIndex: 50,
      pointerEvents: open ? 'auto' : 'none'
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: onClose,
    style: {
      position: 'absolute',
      inset: 0,
      background: 'var(--scrim)',
      opacity: open ? 1 : 0,
      transition: 'opacity var(--dur-drawer) var(--ease-standard)'
    }
  }), /*#__PURE__*/React.createElement("aside", {
    style: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: 0,
      width: 'min(100%, 360px)',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      padding: 'var(--space-xl)',
      background: 'var(--canvas)',
      transform: open ? 'none' : 'translateX(-100%)',
      transition: 'transform var(--dur-drawer) var(--ease-standard)',
      overflowY: 'auto',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'flex-end'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    icon: "x",
    label: "Close",
    variant: "ghost",
    onClick: onClose
  })), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: 'flex',
      flexDirection: 'column'
    }
  }, links.map(l => /*#__PURE__*/React.createElement("button", {
    key: l,
    type: "button",
    onClick: () => onNavigate && onNavigate(l),
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 'var(--space-xl) 0',
      border: 0,
      background: 'none',
      cursor: 'pointer',
      font: 'var(--type-heading-lg)',
      color: 'var(--ink)',
      textAlign: 'left'
    }
  }, l, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevron-right",
    size: 24
  })))), footer && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'var(--space-section)',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-xl)'
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      font: 'var(--type-body-md)',
      color: 'var(--mute)'
    }
  }, "Become a Member for the best products, inspiration and stories."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-sm)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Button, {
    size: "sm"
  }, "Join Us"), /*#__PURE__*/React.createElement(__ds_scope.Button, {
    size: "sm",
    variant: "secondary"
  }, "Sign In")))));
}
Object.assign(__ds_scope, { NavDrawer });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/NavDrawer.jsx", error: String((e && e.message) || e) }); }

// components/navigation/PrimaryNav.jsx
try { (() => {
function useMedia(q) {
  const [m, setM] = React.useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches);
  React.useEffect(() => {
    const mq = window.matchMedia(q);
    const h = () => setM(mq.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, [q]);
  return m;
}
function PrimaryNav({
  brand = 'finsight',
  links = [],
  active,
  onNavigate,
  onBrand,
  onSearch,
  onMenu,
  onAction,
  actions = ['heart', 'shopping-bag'],
  compact,
  style
}) {
  const narrow = useMedia('(max-width: 960px)');
  const c = compact !== undefined ? compact : narrow;
  const mark = /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onBrand,
    style: {
      padding: 0,
      border: 0,
      background: 'none',
      cursor: 'pointer',
      font: '700 24px/1 var(--font-heading)',
      letterSpacing: '-0.03em',
      color: 'var(--ink)'
    }
  }, brand);
  const label = {
    heart: 'Favorites',
    'shopping-bag': 'Bag',
    search: 'Search',
    user: 'Account'
  };
  const base = {
    display: 'grid',
    alignItems: 'center',
    height: 60,
    padding: '0 var(--gutter)',
    background: 'var(--canvas)',
    ...style
  };
  if (c) return /*#__PURE__*/React.createElement("header", {
    style: {
      ...base,
      gridTemplateColumns: '1fr auto 1fr'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    icon: "menu",
    label: "Menu",
    variant: "ghost",
    onClick: onMenu
  })), mark, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: 4
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    icon: "search",
    label: "Search",
    variant: "ghost",
    onClick: () => onSearch && onSearch('')
  }), /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    icon: "shopping-bag",
    label: "Bag",
    variant: "ghost",
    onClick: () => onAction && onAction('shopping-bag')
  })));
  return /*#__PURE__*/React.createElement("header", {
    style: {
      ...base,
      gridTemplateColumns: '1fr auto 1fr'
    }
  }, /*#__PURE__*/React.createElement("div", null, mark), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: 'flex',
      alignSelf: 'stretch'
    }
  }, links.map(l => /*#__PURE__*/React.createElement("button", {
    key: l,
    type: "button",
    onClick: () => onNavigate && onNavigate(l),
    style: {
      padding: '0 12px',
      border: 0,
      background: 'none',
      cursor: 'pointer',
      font: 'var(--type-body-strong)',
      color: 'var(--ink)',
      whiteSpace: 'nowrap',
      boxShadow: active === l ? 'inset 0 -2px 0 var(--ink)' : 'none'
    }
  }, l))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'flex-end',
      alignItems: 'center',
      gap: 4
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.SearchPill, {
    onSubmit: onSearch,
    width: 180,
    style: {
      marginRight: 8
    }
  }), actions.map(a => /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    key: a,
    icon: a,
    label: label[a] || a,
    variant: "ghost",
    onClick: () => onAction && onAction(a)
  }))));
}
Object.assign(__ds_scope, { PrimaryNav });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/PrimaryNav.jsx", error: String((e && e.message) || e) }); }

// components/navigation/SubNav.jsx
try { (() => {
function SubNav({
  breadcrumb = [],
  title,
  count,
  filtersVisible = true,
  onToggleFilters,
  sortLabel = 'Featured',
  onSort,
  sticky = false,
  onCrumb,
  style
}) {
  const ctl = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: 0,
    border: 0,
    background: 'none',
    cursor: 'pointer',
    font: 'var(--type-button-md)',
    color: 'var(--ink)'
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: 'var(--space-xl)',
      flexWrap: 'wrap',
      padding: 'var(--space-lg) var(--gutter)',
      background: 'var(--canvas)',
      boxShadow: 'var(--shadow-inset-bottom)',
      position: sticky ? 'sticky' : 'relative',
      top: 0,
      zIndex: sticky ? 10 : 'auto',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", null, breadcrumb.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-caption-md)',
      color: 'var(--mute)'
    }
  }, breadcrumb.map((b, i) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: i
  }, i > 0 && ' / ', /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => onCrumb && onCrumb(b),
    style: {
      padding: 0,
      border: 0,
      background: 'none',
      font: 'inherit',
      color: 'inherit',
      cursor: 'pointer'
    }
  }, b)))), title && /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      font: 'var(--type-heading-lg)',
      color: 'var(--ink)'
    }
  }, title, count != null && /*#__PURE__*/React.createElement("span", null, " (", count, ")"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-xl)'
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onToggleFilters,
    style: ctl
  }, filtersVisible ? 'Hide Filters' : 'Show Filters', /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "sliders-horizontal",
    size: 20
  })), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onSort,
    style: ctl
  }, "Sort By", sortLabel ? ': ' + sortLabel : '', /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevron-down",
    size: 20
  }))));
}
Object.assign(__ds_scope, { SubNav });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/SubNav.jsx", error: String((e && e.message) || e) }); }

// components/navigation/UtilityBar.jsx
try { (() => {
function UtilityBar({
  links = ['Find a Store', 'Help', 'Join Us', 'Sign In'],
  left,
  onLink,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: 36,
      padding: '0 var(--gutter)',
      background: 'var(--soft-cloud)',
      font: 'var(--type-caption-sm)',
      color: 'var(--ink)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", null, left), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }
  }, links.map((l, i) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: l
  }, i > 0 && /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "|"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => onLink && onLink(l),
    style: {
      padding: 0,
      border: 0,
      background: 'none',
      font: 'inherit',
      color: 'inherit',
      cursor: 'pointer'
    }
  }, l)))));
}
Object.assign(__ds_scope, { UtilityBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/UtilityBar.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Detail.jsx
try { (() => {
function Detail({
  go,
  product,
  onAdd
}) {
  const {
    Button,
    IconButton,
    PriceRow,
    SwatchDot,
    DisclosureRow,
    Badge
  } = window.FinsightDesignSystem_e79c28;
  const p = product || PRODUCTS[0];
  const [img, setImg] = React.useState(0);
  const [size, setSize] = React.useState(null);
  const [color, setColor] = React.useState(0);
  const [fav, setFav] = React.useState(false);
  const sizes = ['M 7', 'M 8', 'M 8.5', 'M 9', 'M 9.5', 'M 10', 'M 10.5', 'M 11', 'M 12'];
  return /*#__PURE__*/React.createElement("main", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'minmax(0,1.4fr) minmax(320px,456px)',
      gap: 'var(--space-section)',
      padding: 'var(--space-section) var(--gutter)',
      maxWidth: 'var(--container-max)',
      margin: '0 auto',
      boxSizing: 'border-box'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-md)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, [0, 1, 2, 3, 4].map(i => /*#__PURE__*/React.createElement("button", {
    key: i,
    onClick: () => setImg(i),
    style: {
      width: 60,
      height: 60,
      padding: 0,
      border: 0,
      borderRadius: 0,
      background: 'var(--soft-cloud)',
      cursor: 'pointer',
      opacity: img === i ? 1 : 0.6,
      boxShadow: img === i ? 'inset 0 0 0 1px var(--ink)' : 'none'
    }
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      flex: 1,
      aspectRatio: '1 / 1',
      background: 'var(--soft-cloud)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      font: 'var(--type-caption-md)',
      color: 'var(--stone)'
    }
  }, "Product image ", img + 1, p.badge && /*#__PURE__*/React.createElement(Badge, {
    style: {
      position: 'absolute',
      top: 16,
      left: 16
    }
  }, p.badge), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      right: 16,
      bottom: 16,
      display: 'flex',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(IconButton, {
    icon: "chevron-left",
    label: "Previous",
    variant: "canvas",
    onClick: () => setImg(i => (i + 4) % 5)
  }), /*#__PURE__*/React.createElement(IconButton, {
    icon: "chevron-right",
    label: "Next",
    variant: "canvas",
    onClick: () => setImg(i => (i + 1) % 5)
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-xl)'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      font: 'var(--type-heading-lg)'
    }
  }, p.name), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-body-strong)',
      color: 'var(--mute)'
    }
  }, p.subtitle), /*#__PURE__*/React.createElement(PriceRow, {
    size: "lg",
    price: p.price,
    originalPrice: p.originalPrice,
    discount: p.discount,
    style: {
      marginTop: 'var(--space-md)'
    }
  })), p.swatches && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 12
    }
  }, p.swatches.map((c, i) => /*#__PURE__*/React.createElement(SwatchDot, {
    key: c,
    color: c,
    size: 20,
    active: i === color,
    onClick: () => setColor(i)
  }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      font: 'var(--type-body-strong)',
      marginBottom: 'var(--space-md)'
    }
  }, "Select Size", /*#__PURE__*/React.createElement("a", {
    href: "#",
    onClick: e => e.preventDefault(),
    style: {
      font: 'var(--type-caption-md)',
      color: 'var(--mute)'
    }
  }, "Size Guide")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3,1fr)',
      gap: 8
    }
  }, sizes.map(s => /*#__PURE__*/React.createElement("button", {
    key: s,
    onClick: () => setSize(s),
    style: {
      height: 48,
      borderRadius: 'var(--radius-lg)',
      border: '1px solid ' + (size === s ? 'var(--ink)' : 'var(--hairline)'),
      background: 'var(--canvas)',
      font: 'var(--type-body-md)',
      color: 'var(--ink)',
      cursor: 'pointer'
    }
  }, s)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-md)'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    fullWidth: true,
    disabled: !size,
    onClick: () => onAdd(p)
  }, size ? 'Add to Bag' : 'Select a Size'), /*#__PURE__*/React.createElement(Button, {
    fullWidth: true,
    variant: "secondary",
    iconRight: "heart",
    onClick: () => setFav(f => !f)
  }, fav ? 'Favorited' : 'Favorite')), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      font: 'var(--type-body-md)',
      color: 'var(--charcoal)'
    }
  }, "A lightweight trail shoe with a lugged outsole for loose descents and a breathable upper for long days out."), /*#__PURE__*/React.createElement("a", {
    href: "#",
    onClick: e => e.preventDefault()
  }, "View Product Details"), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: '1px solid var(--hairline)'
    }
  }, /*#__PURE__*/React.createElement(DisclosureRow, {
    label: "Shipping & Returns"
  }, "Free standard shipping on orders over $50. Free returns for Members within 60 days."), /*#__PURE__*/React.createElement(DisclosureRow, {
    label: "Reviews",
    count: 128
  }, "4.6 out of 5 stars."))));
}
window.Detail = Detail;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Detail.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Home.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function SectionHead({
  title,
  right
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '0 var(--gutter)',
      marginBottom: 'var(--space-xl)'
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      font: 'var(--type-heading-lg)'
    }
  }, title), right);
}
function Home({
  go
}) {
  const {
    CampaignTile,
    ProductCard,
    CategoryIconCard,
    Button,
    IconButton
  } = window.FinsightDesignSystem_e79c28;
  const rail = React.useRef(null);
  const scroll = d => rail.current && rail.current.scrollBy({
    left: d * 320,
    behavior: 'smooth'
  });
  return /*#__PURE__*/React.createElement("main", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-section)',
      paddingBottom: 'var(--space-section)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 var(--gutter)'
    }
  }, /*#__PURE__*/React.createElement(CampaignTile, {
    headline: "Built for\nthe long run",
    body: "New trail essentials, tested on the steepest climbs.",
    ctaLabel: "Shop",
    onCta: () => go('listing'),
    minHeight: 480
  })), /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement(SectionHead, {
    title: "Trending Now"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))',
      gap: 'var(--grid-gutter)',
      padding: '0 var(--gutter)'
    }
  }, PRODUCTS.slice(0, 3).map(p => /*#__PURE__*/React.createElement(ProductCard, _extends({
    key: p.id
  }, p, {
    placeholder: "Product image",
    aspectRatio: "4 / 5",
    onClick: () => go('detail', p)
  }))))), /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement(SectionHead, {
    title: "Shop by Sport",
    right: /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement(IconButton, {
      icon: "chevron-left",
      label: "Previous",
      onClick: () => scroll(-1)
    }), /*#__PURE__*/React.createElement(IconButton, {
      icon: "chevron-right",
      label: "Next",
      onClick: () => scroll(1)
    }))
  }), /*#__PURE__*/React.createElement("div", {
    ref: rail,
    style: {
      display: 'flex',
      gap: 'var(--grid-gutter)',
      overflowX: 'auto',
      padding: '0 var(--gutter)',
      scrollbarWidth: 'none'
    }
  }, ['Running', 'Trail', 'Training', 'Basketball', 'Golf', 'Tennis'].map(s => /*#__PURE__*/React.createElement("div", {
    key: s,
    style: {
      position: 'relative',
      flex: '0 0 min(320px,70vw)',
      aspectRatio: '4 / 5',
      background: 'var(--ash)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 'var(--space-xl)',
      bottom: 'var(--space-xl)'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "on-image",
    onClick: () => go('listing')
  }, s)))))), /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement(SectionHead, {
    title: "Latest in Clothing"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))',
      gap: 'var(--grid-gutter)',
      padding: '0 var(--gutter)'
    }
  }, [['shirt', 'Tops & T-Shirts'], ['footprints', 'Shoes'], ['backpack', 'Bags'], ['watch', 'Accessories']].map(([i, l]) => /*#__PURE__*/React.createElement(CategoryIconCard, {
    key: l,
    icon: i,
    label: l,
    onClick: () => go('listing')
  })))));
}
window.Home = Home;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Home.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Listing.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Listing({
  go
}) {
  const {
    SubNav,
    FilterSidebar,
    FilterChip,
    ProductCard
  } = window.FinsightDesignSystem_e79c28;
  const [show, setShow] = React.useState(true);
  const [chip, setChip] = React.useState('All');
  const [groups, setGroups] = React.useState([{
    title: 'Gender',
    options: [{
      label: 'Men',
      active: true
    }, {
      label: 'Women'
    }, {
      label: 'Unisex'
    }]
  }, {
    title: 'Shop by Price',
    options: [{
      label: 'Under $50',
      count: 2
    }, {
      label: '$50 – $100',
      count: 1
    }, {
      label: '$100 – $150',
      count: 2
    }, {
      label: 'Over $150',
      count: 1
    }]
  }, {
    title: 'Sale & Offers',
    options: [{
      label: 'Sale',
      count: 2
    }]
  }, {
    title: 'Surface',
    options: [{
      label: 'Trail'
    }, {
      label: 'Road'
    }, {
      label: 'Track'
    }]
  }]);
  const toggle = (gi, oi) => setGroups(gs => gs.map((g, i) => i !== gi ? g : {
    ...g,
    options: g.options.map((o, j) => j === oi ? {
      ...o,
      active: !o.active
    } : o)
  }));
  const items = chip === 'Sale' ? PRODUCTS.filter(p => p.originalPrice) : PRODUCTS;
  return /*#__PURE__*/React.createElement("main", {
    style: {
      paddingBottom: 'var(--space-section)'
    }
  }, /*#__PURE__*/React.createElement(SubNav, {
    sticky: true,
    breadcrumb: ['Men', 'Shoes'],
    title: "Men's Trail Running",
    count: items.length,
    filtersVisible: show,
    onToggleFilters: () => setShow(s => !s),
    onCrumb: () => go('home')
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-xl)',
      padding: 'var(--space-xl) var(--gutter) 0'
    }
  }, show && /*#__PURE__*/React.createElement(FilterSidebar, {
    groups: groups,
    onToggle: toggle,
    style: {
      position: 'sticky',
      top: 96,
      alignSelf: 'flex-start'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      flexWrap: 'wrap',
      marginBottom: 'var(--space-xl)'
    }
  }, ['All', 'Shoes', 'Clothing', 'Sale'].map(c => /*#__PURE__*/React.createElement(FilterChip, {
    key: c,
    active: chip === c,
    onClick: () => setChip(c)
  }, c))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))',
      columnGap: 'var(--grid-gutter)',
      rowGap: 'var(--space-section)'
    }
  }, items.map(p => /*#__PURE__*/React.createElement(ProductCard, _extends({
    key: p.id
  }, p, {
    placeholder: "Product image",
    onClick: () => go('detail', p)
  })))))));
}
window.Listing = Listing;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Listing.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Membership.jsx
try { (() => {
function Membership({
  go
}) {
  const {
    CampaignTile,
    MemberBenefitCard,
    DisclosureRow
  } = window.FinsightDesignSystem_e79c28;
  return /*#__PURE__*/React.createElement("main", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-section)',
      paddingBottom: 'var(--space-section)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 var(--gutter)'
    }
  }, /*#__PURE__*/React.createElement(CampaignTile, {
    headline: "Member\nbenefits",
    body: "Free shipping, early access and member-only products.",
    ctaLabel: "Join Us",
    secondaryCtaLabel: "Sign In",
    minHeight: 440
  })), /*#__PURE__*/React.createElement("section", {
    style: {
      padding: '0 var(--gutter)'
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: '0 0 var(--space-xl)',
      font: 'var(--type-heading-lg)'
    }
  }, "Member Benefits"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))',
      gap: 'var(--grid-gutter)'
    }
  }, ['Member Product', 'Member Rewards', 'Sport & Wellness'].map(t => /*#__PURE__*/React.createElement(MemberBenefitCard, {
    key: t,
    title: t,
    onCta: () => go('listing')
  })))), /*#__PURE__*/React.createElement("section", {
    style: {
      padding: '0 var(--gutter)',
      maxWidth: 960
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: '0 0 var(--space-md)',
      font: 'var(--type-heading-xl)'
    }
  }, "FAQs"), [['Is membership free?', 'Yes. Joining is free and takes a minute.'], ['What do Members get?', 'Free standard shipping, member pricing, and early access to launches.'], ['How do I cancel?', 'You can delete your account at any time from Settings.']].map(([q, a]) => /*#__PURE__*/React.createElement(DisclosureRow, {
    key: q,
    variant: "faq",
    label: q
  }, a))));
}
window.Membership = Membership;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Membership.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/data.jsx
try { (() => {
const NAV_LINKS = ['New & Featured', 'Men', 'Women', 'Kids', 'Sale'];
const PRODUCTS = [{
  id: 1,
  name: 'Ridge Trail',
  subtitle: "Men's Trail Shoes",
  colorCount: '3 Colors',
  price: '$140',
  badge: 'Just In',
  swatches: ['#111111', '#0a7281', '#ffffff']
}, {
  id: 2,
  name: 'Ridge Trail GTX',
  subtitle: "Men's Waterproof Trail Shoes",
  colorCount: '2 Colors',
  price: '$97.97',
  originalPrice: '$160',
  discount: '38% off',
  swatches: ['#4b4b4d', '#beaffd']
}, {
  id: 3,
  name: 'Field Shell',
  subtitle: "Men's Jacket",
  colorCount: '1 Color',
  price: '$180'
}, {
  id: 4,
  name: 'Long Run Tee',
  subtitle: "Men's Dri Top",
  colorCount: '5 Colors',
  price: '$45',
  badge: 'Recycled Materials'
}, {
  id: 5,
  name: 'Summit Short',
  subtitle: "Men's 7\" Shorts",
  colorCount: '4 Colors',
  price: '$31.97',
  originalPrice: '$55',
  discount: '41% off'
}, {
  id: 6,
  name: 'Ridge Trail Low',
  subtitle: "Men's Trail Shoes",
  colorCount: '2 Colors',
  price: '$120',
  badge: 'Coming Soon'
}];
const FOOTER_COLS = [{
  title: 'Resources',
  links: ['Find a Store', 'Become a Member', 'Send Us Feedback']
}, {
  title: 'Help',
  links: ['Get Help', 'Order Status', 'Shipping and Delivery', 'Returns']
}, {
  title: 'Company',
  links: ['About Finsight', 'News', 'Careers', 'Investors']
}, {
  title: 'Promotions & Discounts',
  links: ['Student', 'Military', 'Teacher']
}];
const LEGAL = ['Guides', 'Terms of Sale', 'Terms of Use', 'Privacy Policy'];
Object.assign(window, {
  NAV_LINKS,
  PRODUCTS,
  FOOTER_COLS,
  LEGAL
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/data.jsx", error: String((e && e.message) || e) }); }

__ds_ns.CampaignTile = __ds_scope.CampaignTile;

__ds_ns.CategoryIconCard = __ds_scope.CategoryIconCard;

__ds_ns.MemberBenefitCard = __ds_scope.MemberBenefitCard;

__ds_ns.ProductCard = __ds_scope.ProductCard;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Icon = __ds_scope.Icon;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.PriceRow = __ds_scope.PriceRow;

__ds_ns.SwatchDot = __ds_scope.SwatchDot;

__ds_ns.DisclosureRow = __ds_scope.DisclosureRow;

__ds_ns.FilterChip = __ds_scope.FilterChip;

__ds_ns.FilterSidebar = __ds_scope.FilterSidebar;

__ds_ns.SearchPill = __ds_scope.SearchPill;

__ds_ns.Footer = __ds_scope.Footer;

__ds_ns.NavDrawer = __ds_scope.NavDrawer;

__ds_ns.PrimaryNav = __ds_scope.PrimaryNav;

__ds_ns.SubNav = __ds_scope.SubNav;

__ds_ns.UtilityBar = __ds_scope.UtilityBar;

})();
