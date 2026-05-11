Got it — I analyzed your screenshots and will base the spec on that visual style (dark luxury + gold accents, rounded cards, strong product focus, app-like UI). Below is a **professional, structured Figma Technical Task** your designer can directly follow.

---

# **Figma Technical Design Specification (TDS)**

## **Project: “The F.K.H” Mobile-First Web App**

---

## **1. Objective**

Design a **mobile-first e-commerce web application** that feels like a **native premium app**, inspired by the provided references:

* Dark UI with **gold accent highlights**
* Rounded product cards with depth
* Strong focus on **visual content (images + video)**
* Smooth, modern animations
* Clean hierarchy and intuitive navigation

---

## **2. Design Direction (Based on References)**

### **Style Observations from Provided Screens**

* Dark luxury theme (black + gold)
* Large bold typography in hero section
* Rounded UI elements (buttons, chips, cards)
* Product-first layout (grid cards with strong visuals)
* Tag labels (brands/categories) on cards
* Subtle shadows and glow effects
* Minimal but premium UI

### **Improved Direction (Required)**

* Make UI more **app-like (iOS quality)**
* Increase **micro-interactions**
* Improve **spacing consistency**
* Add **motion design system**
* Enhance **video integration inside cards**

---

## **3. Platforms & Breakpoints**

### **Primary (Mandatory)**

* Mobile: 375px / 390px / 430px

### **Secondary**

* Tablet: 768px
* Desktop: 1440px (scaled version of mobile UI)

---

## **4. Design System (Must be created in Figma)**

### **4.1 Colors**

#### **User App**

* Background: #0B0B0C
* Surface: #121214
* Card: #1A1A1D
* Primary Accent: #F5A623 (gold)
* Secondary Accent: #FFD166
* Text Primary: #FFFFFF
* Text Secondary: #A0A0A0

#### **Admin Panel**

* Background: #0A0F1C
* Surface: #111827
* Accent Blue: #3B82F6
* Accent Light Blue: #60A5FA

---

### **4.2 Typography**

* Headings: Bold / SemiBold (modern sans-serif)
* Body: Regular
* Large hero typography (like reference)

Hierarchy:

* H1 (Hero)
* H2 (Section Titles)
* H3 (Card Titles)
* Body
* Caption

---

### **4.3 Components (Reusable)**

* Buttons (Primary, Secondary, Ghost)
* Product Card
* Category Chips
* Navigation Bar
* Bottom CTA Buttons
* Quantity Selector
* Video Player UI
* Profile Card
* Order Card
* Contact Card

---

## **5. Screens & UX Flow**

---

## **5.1 Splash / Home Screen**

### **Layout**

* Fullscreen hero
* Center:

  * Logo (animated)
  * Title: **“The F.K.H”**

### **Top Bar**

* Left: Logo (small)
* Right:

  * Profile Icon
  * Cart Icon

### **Bottom**

Two large CTA buttons:

* **Apri Catalogo** (Primary)
* **Contatti** (Secondary)

### **Animations**

* Logo fade + scale
* Buttons slide up
* Background subtle motion

---

## **5.2 Catalog Screen**

### **Structure**

1. Search bar (optional but recommended)
2. Horizontal scroll categories (chips)
3. Product grid

### **Categories (chips)**

* Rounded pills
* Active = filled gold
* Inactive = outlined

---

## **5.3 Product Card (IMPORTANT)**

### **Layout**

* Top: **Gallery Preview (Image/Video)**

  * Swipeable carousel
  * Video support
  * Custom player UI (minimal, stylish)

### **Overlay Elements**

* Brand tag (top-left)
* Optional badge (+1, +2 like reference)

### **Bottom Section**

* Product Name
* Short Description
* Price block:

Example:

```
1g – 10€
2g – 20€
3g – 30€
```

* Quantity selector (stepper or dropdown)
* Button: **Add to Cart**

### **Interactions**

* Hover/tap = slight scale + shadow
* Swipe gallery
* Video autoplay (muted)

---

## **5.4 Product Detail (Recommended addition)**

* Full gallery (images + video)
* Expanded pricing options
* Description
* Add to cart
* Sticky bottom CTA

---

## **5.5 Cart Screen**

### **Elements**

* List of products
* Each item:

  * Thumbnail
  * Name
  * Selected weight
  * Price
  * Quantity stepper

### **Bottom Section**

* Total price
* Checkout button

### **UX**

* Swipe to remove
* Smooth transitions

---

## **5.6 Profile Screen**

### **Header**

* User photo
* Name

### **Sections**

1. Current Orders

   * Status:

     * Pending
     * Accepted

2. Order History

   * Completed orders list

### **Cards**

* Clean, minimal, status-highlighted

---

## **5.7 Contacts Screen**

### **Layout**

* Grid or list of **interactive cards**

### **Card Types**

* Phone
* Telegram / WhatsApp
* Email
* Address

### **Design Requirements**

* Animated hover/tap
* Icon-driven UI
* Premium look

---

## **6. Admin Panel (Separate Design System)**

### **Style**

* Dark theme + **blue accents**
* More structured, dashboard-like

---

### **6.1 Pages**

#### **Dashboard**

* Stats (orders, revenue, users)

#### **Products**

* Add/Edit/Delete products
* Upload gallery (images + video)
* Set price per gram

#### **Orders**

* List of orders
* Status management:

  * Pending
  * Accepted
  * Completed

#### **Users**

* Profile management

---

### **6.2 Admin UX Requirements**

* Fast interaction
* Table + card hybrid UI
* Modal editing
* Drag & drop uploads

---

## **7. Motion & Interaction**

* Page transitions (fade/slide)
* Button press animations
* Card hover/tap feedback
* Smooth scrolling
* Micro-interactions everywhere

---

## **8. Video Player (Custom UI)**

* Minimal overlay controls
* Play/Pause center button
* Progress bar
* Mute toggle
* Styled to match dark luxury theme

---

## **9. Deliverables in Figma**

Designer must provide:

* Full design system (components + styles)
* Mobile-first layouts
* Interactive prototype
* All screens:

  * Splash
  * Home
  * Catalog
  * Product Card
  * Cart
  * Profile
  * Contacts
  * Admin Panel
* Motion prototypes (smart animate)

---

## **10. Key UX Goals**

* Feels like a **native app**
* Minimal friction to purchase
* Visually premium
* Fast and intuitive navigation
* Strong product presentation

---

If you want, I can next:

* Turn this into a **ready Figma frame structure (with naming conventions)**
* Or create a **UI wireframe layout (low-fi or high-fi)**
* Or design **exact component specs (spacing, px, grid)**
