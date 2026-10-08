export type WithdrawalDetails = {
  method: string;
  name: string;
  bankName: string;
  iban: string;
  bic: string;
  paypalEmail: string;
  mobileMoneyProvider: string;
  mobileMoneyPhone: string;
};

export function validateWithdrawalDetails(details: WithdrawalDetails) {
  if (details.name.trim().length > 80) return "Le nom du bénéficiaire ne doit pas dépasser 80 caractères.";
  if (!details.method) return "Sélectionnez un moyen de retrait.";
  if (!details.name.trim()) return "Saisissez le nom du bénéficiaire.";

  if (details.method === "bank_transfer") {
    if (details.bankName.length > 80 || details.iban.length > 40 || details.bic.length > 20) {
      return "Les coordonnées bancaires dépassent la longueur autorisée.";
    }
    if (!details.bankName.trim() || !details.iban.trim() || !details.bic.trim()) {
      return "Renseignez la banque, l’IBAN et le BIC.";
    }
    return null;
  }

  if (details.method === "paypal") {
    if (details.paypalEmail.length > 254) return "L’adresse e-mail PayPal est trop longue.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.paypalEmail.trim())) {
      return "Saisissez une adresse e-mail PayPal valide.";
    }
    return null;
  }

  if (details.method === "mobile_money") {
    if (details.mobileMoneyProvider.length > 80 || details.mobileMoneyPhone.length > 40) {
      return "Les coordonnées Mobile money dépassent la longueur autorisée.";
    }
    if (!details.mobileMoneyProvider.trim() || !details.mobileMoneyPhone.trim()) {
      return "Renseignez l’opérateur et le numéro de téléphone Mobile money.";
    }
    return null;
  }

  return "Sélectionnez un moyen de retrait valide.";
}
