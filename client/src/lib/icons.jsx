import {
  BroomIcon,
  BugIcon,
  CarIcon,
  DropIcon,
  HammerIcon,
  LightningIcon,
  PaintRollerIcon,
  SnowflakeIcon,
  SolarPanelIcon,
  WashingMachineIcon,
  WrenchIcon,
} from '@phosphor-icons/react';

/** Category icons. Admins pick from these names when creating categories. */
export const CATEGORY_ICONS = {
  Drop: DropIcon,
  Lightning: LightningIcon,
  Snowflake: SnowflakeIcon,
  Car: CarIcon,
  Broom: BroomIcon,
  Hammer: HammerIcon,
  PaintRoller: PaintRollerIcon,
  WashingMachine: WashingMachineIcon,
  Bug: BugIcon,
  SolarPanel: SolarPanelIcon,
  Wrench: WrenchIcon,
};

export function CategoryIcon({ name, ...props }) {
  const Icon = CATEGORY_ICONS[name] || WrenchIcon;
  return <Icon aria-hidden="true" {...props} />;
}
