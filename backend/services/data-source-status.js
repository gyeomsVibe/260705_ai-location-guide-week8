const SOURCE_DEFINITIONS = [
  ["moisBenefits", "행정안전부 공공서비스(혜택)", "MOIS_PUBLIC_SERVICE_API_KEY", "available"],
  ["semasStores", "소상공인시장진흥공단 상가정보", "SEMAS_STORE_API_KEY", "available"],
  ["nmcHospitals", "국립중앙의료원 전국 병·의원", "NMC_HOSPITAL_API_KEY", "planned"],
  ["nmcPharmacies", "국립중앙의료원 전국 약국", "NMC_PHARMACY_API_KEY", "planned"],
  ["nmcHolidayMedical", "국립중앙의료원 명절 비상진료", "NMC_HOLIDAY_MEDICAL_API_KEY", "planned"],
  ["nmcEmergency", "국립중앙의료원 응급의료기관", "NMC_EMERGENCY_API_KEY", "planned"]
].map(([id, label, environmentVariable, implementationStatus]) => ({
  id,
  label,
  environmentVariable,
  implementationStatus
}));

function isConfigured(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function createDataSourceMonitor(environment = {}, now = () => new Date()) {
  const verification = new Map();

  function recordSuccess(id) {
    const checkedAt = now().toISOString();
    verification.set(id, {
      verificationStatus: "success",
      lastCheckedAt: checkedAt,
      lastSuccessAt: checkedAt,
      lastErrorCode: null
    });
  }

  function recordFailure(id, errorCode = "UPSTREAM_ERROR") {
    const previous = verification.get(id);
    verification.set(id, {
      verificationStatus: "failed",
      lastCheckedAt: now().toISOString(),
      lastSuccessAt: previous?.lastSuccessAt ?? null,
      lastErrorCode: String(errorCode).slice(0, 80)
    });
  }

  function snapshot() {
    return SOURCE_DEFINITIONS.map((definition) => {
      const configured = isConfigured(environment[definition.environmentVariable]);
      const current = verification.get(definition.id);
      let message = "인증키가 설정되지 않았습니다.";

      if (configured && definition.implementationStatus === "planned") {
        message = "인증키는 준비됐지만 API 연결은 아직 구현 전입니다.";
      } else if (configured && current?.verificationStatus === "success") {
        message = "최근 API 연결 확인에 성공했습니다.";
      } else if (configured && current?.verificationStatus === "failed") {
        message = "최근 API 연결 확인에 실패했습니다.";
      } else if (configured) {
        message = "인증키가 설정됐으며 첫 API 호출을 기다리고 있습니다.";
      }

      return {
        id: definition.id,
        label: definition.label,
        configured,
        implementationStatus: definition.implementationStatus,
        verificationStatus: current?.verificationStatus ?? "not_tested",
        lastCheckedAt: current?.lastCheckedAt ?? null,
        lastSuccessAt: current?.lastSuccessAt ?? null,
        lastErrorCode: current?.lastErrorCode ?? null,
        message
      };
    });
  }

  return { recordFailure, recordSuccess, snapshot };
}

module.exports = { createDataSourceMonitor };
