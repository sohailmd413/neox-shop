import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

const STORAGE_KEY = "mf_lang";

const translations = {
  en: {
    "nav.shop": "Shop",
    "nav.new": "New Arrivals",
    "nav.sale": "Sale",
    "nav.search": "Search",
    "nav.searchProducts": "Search products",
    "nav.adminPanel": "Admin panel",
    "nav.adminSignin": "Admin sign in",
    "nav.signOut": "Sign out",
    "nav.signIn": "Sign in",
    "nav.myOrders": "My orders",
    "nav.wishlist": "Wishlist",
    "nav.openCart": "Open cart",
    "nav.menu": "Menu",
    "footer.tagline": "Considered objects for everyday living. Designed to last, made to be loved.",
    "footer.shop": "Shop",
    "footer.allProducts": "All products",
    "footer.newArrivals": "New arrivals",
    "footer.sale": "Sale",
    "footer.support": "Support",
    "footer.shipping": "Shipping & returns",
    "footer.contact": "Contact us",
    "footer.faq": "FAQ",
    "footer.newsletter": "Newsletter",
    "footer.newsletterText": "Join for early access to new collections.",
    "footer.emailPlaceholder": "Email address",
    "footer.join": "Join",
    "footer.rights": `© ${new Date().getFullYear()} Maison. All rights reserved.`,
    "footer.crafted": "Crafted with care.",
    "lang.btn": "العربية",
  },
  ar: {
    "nav.shop": "المتجر",
    "nav.new": "وصل حديثًا",
    "nav.sale": "التخفيضات",
    "nav.search": "بحث",
    "nav.searchProducts": "ابحث عن المنتجات",
    "nav.adminPanel": "لوحة الإدارة",
    "nav.adminSignin": "دخول المدير",
    "nav.signOut": "تسجيل الخروج",
    "nav.signIn": "تسجيل الدخول",
    "nav.myOrders": "طلباتي",
    "nav.wishlist": "المفضلة",
    "nav.openCart": "فتح السلة",
    "nav.menu": "القائمة",
    "footer.tagline": "قطع مختارة للحياة اليومية. مصممة لتبقى، محبوّة لتُحَب.",
    "footer.shop": "المتجر",
    "footer.allProducts": "كل المنتجات",
    "footer.newArrivals": "وصل حديثًا",
    "footer.sale": "التخفيضات",
    "footer.support": "الدعم",
    "footer.shipping": "الشحن والإرجاع",
    "footer.contact": "اتصل بنا",
    "footer.faq": "الأسئلة الشائعة",
    "footer.newsletter": "النشرة البريدية",
    "footer.newsletterText": "اشترك للحصول على وصول مبكر للمجموعات الجديدة.",
    "footer.emailPlaceholder": "البريد الإلكتروني",
    "footer.join": "اشترك",
    "footer.rights": `© ${new Date().getFullYear()} ميزون. جميع الحقوق محفوظة.`,
    "footer.crafted": "صُنع بعناية.",
    "lang.btn": "English",
  },
};

const LanguageContext = createContext({ lang: "en", t: (k) => k, setLang: () => {}, toggle: () => {} });

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => localStorage.getItem(STORAGE_KEY) || "en");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, lang);
    const dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.setAttribute("dir", dir);
    document.documentElement.setAttribute("lang", lang);
  }, [lang]);

  const setLang = useCallback((l) => setLangState(l), []);
  const toggle = useCallback(() => setLangState((l) => (l === "en" ? "ar" : "en")), []);
  const t = useCallback((key) => translations[lang]?.[key] ?? translations.en[key] ?? key, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, t, setLang, toggle }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}