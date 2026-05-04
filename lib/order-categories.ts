export type OrderCategory = 'sublimation' | 'acrylic_signs' | 'tarpaulin_other_services';

export type OrderStepDefinition = {
  key: string;
  title: string;
  description: string;
};

export const orderCategories: Array<{
  value: OrderCategory;
  label: string;
  helper: string;
}> = [
  {
    value: 'sublimation',
    label: 'Sublimation',
    helper: 'Designing, printing, sewing, checking, ready for pick up, claimed',
  },
  {
    value: 'acrylic_signs',
    label: 'Acrylic Signs',
    helper: 'Designing, fabricating, ready for installation, installed',
  },
  {
    value: 'tarpaulin_other_services',
    label: 'Tarpaulin & Other Services',
    helper: 'Designing, printing, ready for pick up, claimed',
  },
];

export const defaultOrderCategory: OrderCategory = 'tarpaulin_other_services';

export const orderCategoryLabel: Record<OrderCategory, string> = {
  sublimation: 'Sublimation',
  acrylic_signs: 'Acrylic Signs',
  tarpaulin_other_services: 'Tarpaulin & Other Services',
};

export const orderTrackingSteps: Record<OrderCategory, OrderStepDefinition[]> = {
  sublimation: [
    { key: 'designing', title: 'Designing', description: 'Layout and print file preparation.' },
    { key: 'printing', title: 'Printing', description: 'Your order is being produced.' },
    { key: 'sewing', title: 'Sewing', description: 'The printed material is being sewn and assembled.' },
    { key: 'checking', title: 'Checking', description: 'Quality checks are being completed before release.' },
    { key: 'ready', title: 'Ready for pick up', description: 'Order is ready at the shop.' },
    { key: 'claimed', title: 'Claimed', description: 'Order has been received.' },
  ],
  acrylic_signs: [
    { key: 'designing', title: 'Designing', description: 'Layout and sign details are being prepared.' },
    { key: 'fabricating', title: 'Fabricating', description: 'The acrylic sign is being fabricated.' },
    { key: 'ready', title: 'Ready for installation', description: 'Order is ready for installation scheduling.' },
    { key: 'installed', title: 'Installed', description: 'The acrylic sign has been installed.' },
  ],
  tarpaulin_other_services: [
    { key: 'designing', title: 'Designing', description: 'Layout and print file preparation.' },
    { key: 'printing', title: 'Printing', description: 'Your order is being produced.' },
    { key: 'ready', title: 'Ready for pick up', description: 'Order is ready at the shop.' },
    { key: 'claimed', title: 'Claimed', description: 'Order has been received.' },
  ],
};

export function getOrderCategoryLabel(category: string | null | undefined) {
  return orderCategoryLabel[(category as OrderCategory) || defaultOrderCategory] ?? orderCategoryLabel[defaultOrderCategory];
}

export function getOrderTrackingSteps(category: string | null | undefined) {
  return orderTrackingSteps[(category as OrderCategory) || defaultOrderCategory] ?? orderTrackingSteps[defaultOrderCategory];
}
