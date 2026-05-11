import { RouterProvider } from "react-router";
import { router } from "./routes";
import { CartProvider } from "./store/cart-context";
import { AuthProvider } from "./auth/auth-context";
import { LanguageProvider } from "./i18n";
import { SiteSettingsProvider } from "./site-settings";

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <SiteSettingsProvider>
          <CartProvider>
            <RouterProvider router={router} />
          </CartProvider>
        </SiteSettingsProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
