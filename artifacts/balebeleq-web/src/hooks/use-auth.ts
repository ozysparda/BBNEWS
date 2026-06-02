import { useEffect } from "react";
import { useLocation } from "wouter";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";

export function useAuth() {
  const [, setLocation] = useLocation();
  const token = localStorage.getItem("admin_token");
  
  const { data: user, isLoading, isError } = useGetMe({
    query: {
      enabled: !!token,
      queryKey: getGetMeQueryKey(),
      retry: false
    }
  });

  useEffect(() => {
    if (!token) {
      setLocation("/admin");
    } else if (isError) {
      localStorage.removeItem("admin_token");
      setLocation("/admin");
    }
  }, [token, isError, setLocation]);

  return {
    user,
    isLoading: isLoading || (!!token && !user && !isError),
    isAuthenticated: !!user,
    logout: () => {
      localStorage.removeItem("admin_token");
      setLocation("/admin");
    }
  };
}
