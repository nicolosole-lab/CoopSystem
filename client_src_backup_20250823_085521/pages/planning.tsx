import { useTranslation } from "react-i18next";

export default function Planning() {
  const { t } = useTranslation();

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-green-500 bg-clip-text text-transparent mb-2">
          {t('navigation.items.planningManagement')}
        </h2>
        <p className="text-gray-600">This module is coming soon.</p>
      </div>
    </div>
  );
}