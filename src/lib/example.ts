import type { RoutePoint } from "../types";

// Example stops (the 8 clients from the delivery sheet) so the app shows a
// working route on first launch. Stored in the local DB and fully editable.
export const EXAMPLE_POINTS: RoutePoint[] = [
  { id: "ex-1", label: "Фаустов И.Н. ИП — Гудкова, 13", coordinate: { latitude: 55.598207, longitude: 38.088802 } },
  { id: "ex-2", label: "Городской супермаркет — Дзержинского, 3", coordinate: { latitude: 55.597261, longitude: 38.133322 } },
  { id: "ex-3", label: "Золотое руно плюс — Московская пл., 1", coordinate: { latitude: 55.6012794, longitude: 38.1346615 } },
  { id: "ex-4", label: "Стародубровская — Чкалова, 2", coordinate: { latitude: 55.588359, longitude: 38.133089 } },
  { id: "ex-5", label: "Колесо ООО — Энергетическая, 7", coordinate: { latitude: 55.601788, longitude: 38.117709 } },
  { id: "ex-6", label: "Стародубровская — Быково, Театральная, 3", coordinate: { latitude: 55.6105383, longitude: 38.0864217 } },
  { id: "ex-7", label: "Курбанова И.Р. — Быково, Театральная, 3", coordinate: { latitude: 55.6101515, longitude: 38.0861216 } },
  { id: "ex-8", label: "Мамедов Э.А. — Быково, Театральная, 3", coordinate: { latitude: 55.6105383, longitude: 38.0864217 } },
];
