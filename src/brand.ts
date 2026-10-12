import { currentLang, type Lang } from './i18n';

const B: Record<Lang, { name: string; tag: string }> = {
  tg: { name: 'Дарахти даромад', tag: 'содда ва устувор' },
  ru: { name: 'Дерево дохода', tag: 'просто и устойчиво' },
  en: { name: 'Income Tree', tag: 'simple and stable' },
};

/** Номи барнома, шиор ва логотип — вобаста ба забони барнома. */
export function brand() {
  const l = currentLang();
  return { ...B[l], logo: `${import.meta.env.BASE_URL}logo-${l}.png` };
}
