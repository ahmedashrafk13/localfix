import {
  BriefcaseIcon,
  ChatCircleDotsIcon,
  ClipboardTextIcon,
  HouseIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  ShieldCheckIcon,
  SignInIcon,
  SquaresFourIcon,
  UsersThreeIcon,
} from '@phosphor-icons/react';

/** Top navigation links per role (desktop). Kept short so the nav fits on one line. */
export function topNavFor(user) {
  if (!user) {
    return [
      { to: '/providers', label: 'Find providers' },
      { to: '/requests', label: 'Open requests' },
      { to: '/how-it-works', label: 'How it works' },
      { to: '/tips', label: 'Tips' },
    ];
  }
  if (user.role === 'provider') {
    return [
      { to: '/provider', label: 'Dashboard', end: true },
      { to: '/provider/requests', label: 'Find work' },
      { to: '/provider/offers', label: 'My offers' },
      { to: '/messages', label: 'Messages', badge: 'messages' },
    ];
  }
  if (user.role === 'admin') {
    return [
      { to: '/admin', label: 'Admin', end: true },
      { to: '/requests', label: 'Requests' },
      { to: '/providers', label: 'Providers' },
    ];
  }
  return [
    { to: '/customer', label: 'Dashboard', end: true },
    { to: '/customer/requests', label: 'My requests' },
    { to: '/providers', label: 'Find providers' },
    { to: '/messages', label: 'Messages', badge: 'messages' },
  ];
}

/** Bottom tab bar on phones: primary actions sit in the thumb zone. */
export function tabBarFor(user) {
  if (!user) {
    return [
      { to: '/', label: 'Home', icon: HouseIcon, end: true },
      { to: '/providers', label: 'Providers', icon: UsersThreeIcon },
      { to: '/post-request', label: 'Post', icon: PlusIcon, primary: true },
      { to: '/requests', label: 'Requests', icon: ClipboardTextIcon },
      { to: '/login', label: 'Log in', icon: SignInIcon },
    ];
  }
  if (user.role === 'provider') {
    return [
      { to: '/provider', label: 'Home', icon: SquaresFourIcon, end: true },
      { to: '/provider/requests', label: 'Find work', icon: MagnifyingGlassIcon, primary: true },
      { to: '/provider/offers', label: 'Offers', icon: BriefcaseIcon },
      { to: '/messages', label: 'Messages', icon: ChatCircleDotsIcon, badge: 'messages' },
    ];
  }
  if (user.role === 'admin') {
    return [
      { to: '/admin', label: 'Admin', icon: ShieldCheckIcon, end: true },
      { to: '/requests', label: 'Requests', icon: ClipboardTextIcon },
      { to: '/providers', label: 'Providers', icon: UsersThreeIcon },
    ];
  }
  return [
    { to: '/customer', label: 'Home', icon: SquaresFourIcon, end: true },
    { to: '/providers', label: 'Providers', icon: UsersThreeIcon },
    { to: '/post-request', label: 'Post', icon: PlusIcon, primary: true },
    { to: '/customer/requests', label: 'Requests', icon: ClipboardTextIcon },
    { to: '/messages', label: 'Messages', icon: ChatCircleDotsIcon, badge: 'messages' },
  ];
}
