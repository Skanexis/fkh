import { RouterProvider } from "react-router";
import { router } from "./routes";
import { CartProvider } from "./store/cart-context";
import { AuthProvider } from "./auth/auth-context";
import { LanguageProvider } from "./i18n";

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <CartProvider>
          <RouterProvider router={router} />
        </CartProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
