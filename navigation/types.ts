export type RootStackParamList = {
  Onboarding: undefined
  Auth: undefined
  BuyerTabs: undefined
  ContactSupportScreen: undefined
  AddProduct: undefined
  SellerTabs: undefined
  TermsAndPrivacy: undefined
  Notification: undefined
  // RunnerTabs: undefined
  ProductDetails: { productId: string };
  Chat: { chatId: string; recipientId: string; recipientName: string }
  NewChat: undefined
  ErrandDetails: { errandId: string }
  IdentityVerification: undefined
  SwitchRole: undefined
}

export type BuyerTabParamList = {
  Home: undefined
  Errands: undefined
  ChatList: undefined
  Profile: undefined
}

export type SellerTabParamList = {
  Home: undefined
  Products: undefined
  Orders: undefined
  Profile: undefined
}

export type RunnerTabParamList = {
  Home: undefined
  Earnings: undefined
  ChatList: undefined
  Profile: undefined
}
