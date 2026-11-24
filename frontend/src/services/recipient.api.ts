import { api } from "./api";
import { CsvUploadResult, ApiResponse } from "../types";

export const recipientApi = {
  uploadCsv: async (file: File, emailColumn = "email"): Promise<CsvUploadResult> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("emailColumn", emailColumn);

    const response = await api.post<ApiResponse<CsvUploadResult>>("/recipients/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data.data;
  },

  validateRecipients: async (
    recipients: Array<{ email?: string; [key: string]: any }>
  ): Promise<{
    total: number;
    validCount: number;
    invalidCount: number;
    valid: any[];
    invalid: any[];
  }> => {
    const response = await api.post<ApiResponse<any>>("/recipients/validate", {
      recipients,
    });
    return response.data.data;
  },
};
