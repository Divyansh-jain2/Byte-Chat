import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

const getAuthHeader = () => {
  const token = localStorage.getItem('accessToken');
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

export interface AnonymousIdentity {
  identity_id: string;
  user_id: string;
  random_string: string;
  display_name: string;
  display_gender: string;
  is_active: boolean;
  is_revealed: boolean;
  created_at: string;
  target_user_id?: string;
  target_user?: {
    user_id: string;
    name: string;
    roll_no: string;
    gender: string;
    branch: string;
    dp_url?: string;
  };
  group_id?: string;
  target_group?: {
    group_id: string;
    group_name: string;
    group_desc: string;
    group_image?: string;
    is_public: boolean;
  };
  conversation_id?: string;
}

export interface AnonymousIdentitiesResponse {
  success: boolean;
  message: string;
  data: AnonymousIdentity[];
}

export interface RevealIdentityResponse {
  success: boolean;
  message: string;
}

export interface CreateAnonymousIdentityRequest {
  targetUserId?: string;
  groupId?: string;
  displayGender?: string;
}

export interface CreateAnonymousIdentityResponse {
  success: boolean;
  message: string;
  data: AnonymousIdentity;
}

// // Get all anonymous identities for the current user
// export const getMyAnonymousIdentities = async (): Promise<AnonymousIdentitiesResponse> => {
//   try {
//     const response = await axios.get(
//       `${API_URL}/anonymous/my-identities`,
//       getAuthHeader()
//     );
//     return response.data;
//   } 
//   catch (error: unknown) {
//     throw new Error(error.response?.data?.message || 'Failed to fetch anonymous identities');
//   }
// };


export const getMyAnonymousIdentities = async (): Promise<AnonymousIdentitiesResponse> => {
  try {
    const response = await axios.get(
      `${API_URL}/anonymous/my-identities`,
      getAuthHeader()
    );
    return response.data;
  } 
  catch (error: unknown) {
    const message =
      axios.isAxiosError(error) && error.response?.data?.message
        ? String(error.response.data.message)
        : error instanceof Error
        ? error.message
        : 'Failed to fetch anonymous identities';
    throw new Error(message);
  }
};

// // Reveal anonymous identity (deactivate it)
// export const revealAnonymousIdentity = async (identityId: string): Promise<RevealIdentityResponse> => {
//   try {
//     const response = await axios.put(
//       `${API_URL}/anonymous/reveal/${identityId}`,
//       {},
//       getAuthHeader()
//     );
//     return response.data;
//   } 
//   catch (error: any) {
//     throw new Error(error.response?.data?.message || 'Failed to reveal identity');
//   }
// };

// Reveal anonymous identity (deactivate it)
export const revealAnonymousIdentity = async (identityId: string): Promise<RevealIdentityResponse> => {
  try {
    const response = await axios.put(
      `${API_URL}/anonymous/reveal/${identityId}`,
      {},
      getAuthHeader()
    );
    return response.data;
  } 
  catch (error: unknown) {
    const message =
      axios.isAxiosError(error) && error.response?.data?.message
        ? String(error.response.data.message)
        : error instanceof Error
        ? error.message
        : 'Failed to reveal identity';
    throw new Error(message);
  }
};

// Create a new anonymous identity
export const createAnonymousIdentity = async (
  data: CreateAnonymousIdentityRequest
): Promise<CreateAnonymousIdentityResponse> => {
  try {
    const response = await axios.post(
      `${API_URL}/anonymous/create`,
      data,
      getAuthHeader()
    );
    return response.data;
  } 
  // catch (error: any) {
  //   throw new Error(error.response?.data?.message || 'Failed to create anonymous identity');
  // }
  catch (error: unknown) {
    const message =
      axios.isAxiosError(error) && error.response?.data?.message
        ? String(error.response.data.message)
        : error instanceof Error
        ? error.message
        : 'Failed to create anonymous identity';
    throw new Error(message);
  }
};

// Delete/deactivate anonymous identity
export const deleteAnonymousIdentity = async (identityId: string): Promise<RevealIdentityResponse> => {
  try {
    const response = await axios.delete(
      `${API_URL}/anonymous/${identityId}`,
      getAuthHeader()
    );
    return response.data;
  } 
  // catch (error: any) {
  //   throw new Error(error.response?.data?.message || 'Failed to delete identity');
  // }
  catch (error: unknown) {
    const message =
      axios.isAxiosError(error) && error.response?.data?.message
        ? String(error.response.data.message)
        : error instanceof Error
        ? error.message
        : 'Failed to delete identity';
    throw new Error(message);
  }
};

// Get anonymous identity by ID
export const getAnonymousIdentityById = async (identityId: string): Promise<AnonymousIdentity> => {
  try {
    const response = await axios.get(
      `${API_URL}/anonymous/${identityId}`,
      getAuthHeader()
    );
    return response.data.data;
  } 
  // catch (error: any) {
  //   throw new Error(error.response?.data?.message || 'Failed to fetch identity');
  // }
  catch (error: unknown) {
    const message =
      axios.isAxiosError(error) && error.response?.data?.message
        ? String(error.response.data.message)
        : error instanceof Error
        ? error.message
        : 'Failed to fetch identity';
    throw new Error(message);
  }
};
