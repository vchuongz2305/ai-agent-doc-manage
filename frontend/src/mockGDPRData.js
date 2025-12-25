// Mock GDPR data for testing UI
export const mockGDPRData = {
  processingId: "doc_test_123",
  fileName: "employee_data.pdf",
  fileSize: 2048000,
  mimeType: "application/pdf",
  userId: "user001",
  department: "HR",
  status: "completed",
  steps: {
    analysis: "completed",
    gdpr: "completed",
    sharing: "completed"
  },
  results: {
    analysis: {
      contentSummary: "Document contains employee information",
      keyPoints: ["Employee records", "Salary data", "Personal information"],
      category: "HR",
      sensitivityLevel: "high"
    },
    gdpr: {
      gdprDecision: "anonymize",
      gdprJustification: "Tài liệu chứa nhiều dữ liệu cá nhân nhạy cảm bao gồm email, số điện thoại và địa chỉ nhà riêng của nhân viên. Cần phải ẩn danh hóa trước khi chia sẻ để tuân thủ GDPR.",
      personalDataFound: ["email", "phone", "address", "ID number"],
      sensitiveDataDetected: true,
      dataVolume: "high",
      notifyDPO: true,
      legalBasis: "consent",
      retentionDays: 30,
      redactionFields: ["email", "phone", "address"],
      aiDecisionTimestamp: new Date().toISOString()
    },
    sharing: {
      status: "completed",
      accessLevel: "reader",
      expirationDays: 30
    }
  },
  sharingEmails: ["user1@company.com", "user2@company.com"]
};

export const mockGDPRDataAllow = {
  ...mockGDPRData,
  results: {
    ...mockGDPRData.results,
    gdpr: {
      gdprDecision: "allow",
      gdprJustification: "Tài liệu không chứa dữ liệu cá nhân hoặc dữ liệu nhạy cảm. An toàn để chia sẻ mà không cần xử lý đặc biệt.",
      personalDataFound: [],
      sensitiveDataDetected: false,
      dataVolume: "low",
      notifyDPO: false,
      legalBasis: "legitimate_interest",
      retentionDays: 90,
      redactionFields: [],
      aiDecisionTimestamp: new Date().toISOString()
    }
  }
};

export const mockGDPRDataDelete = {
  ...mockGDPRData,
  results: {
    ...mockGDPRData.results,
    gdpr: {
      gdprDecision: "delete",
      gdprJustification: "Tài liệu chứa dữ liệu cá nhân cực kỳ nhạy cảm và không có cơ sở pháp lý hợp lệ để xử lý. Phải xóa ngay lập tức theo yêu cầu của GDPR Article 17 (Right to erasure).",
      personalDataFound: ["SSN", "medical records", "biometric data"],
      sensitiveDataDetected: true,
      dataVolume: "high",
      notifyDPO: true,
      legalBasis: null,
      retentionDays: 0,
      redactionFields: [],
      aiDecisionTimestamp: new Date().toISOString()
    }
  }
};
