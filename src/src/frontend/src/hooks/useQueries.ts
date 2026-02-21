import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useActor } from "./useActor";
import { SystemStatus, type Citizen, type Transaction, type InputCitizen, type AadhaarStatus } from "../backend";

// ============= Citizen Queries =============

export function useGetAllCitizens() {
  const { actor, isFetching } = useActor();
  return useQuery<Citizen[]>({
    queryKey: ["citizens"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllCitizens();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetCitizen(id: string | null) {
  const { actor, isFetching } = useActor();
  return useQuery<Citizen | null>({
    queryKey: ["citizen", id],
    queryFn: async () => {
      if (!actor || !id) return null;
      return actor.getCitizen(id);
    },
    enabled: !!actor && !isFetching && !!id,
  });
}

export function useCountCitizens() {
  const { actor, isFetching } = useActor();
  return useQuery<bigint>({
    queryKey: ["citizens", "count"],
    queryFn: async () => {
      if (!actor) return 0n;
      return actor.countCitizens();
    },
    enabled: !!actor && !isFetching,
  });
}

// ============= Transaction Queries =============

export function useGetTransactions() {
  const { actor, isFetching } = useActor();
  return useQuery<Transaction[]>({
    queryKey: ["transactions"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getTransactions();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCountTransactions() {
  const { actor, isFetching } = useActor();
  return useQuery<bigint>({
    queryKey: ["transactions", "count"],
    queryFn: async () => {
      if (!actor) return 0n;
      return actor.countTransactions();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetTotalDisbursed() {
  const { actor, isFetching } = useActor();
  return useQuery<bigint>({
    queryKey: ["transactions", "totalDisbursed"],
    queryFn: async () => {
      if (!actor) return 0n;
      return actor.getTotalDisbursed();
    },
    enabled: !!actor && !isFetching,
  });
}

// ============= System Queries =============

export function useGetSystemStatus() {
  const { actor, isFetching } = useActor();
  return useQuery<SystemStatus>({
    queryKey: ["system", "status"],
    queryFn: async () => {
      if (!actor) return SystemStatus.frozen;
      return actor.getSystemStatus();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 5000, // Poll every 5 seconds
  });
}

export function useGetBudget() {
  const { actor, isFetching } = useActor();
  return useQuery<bigint>({
    queryKey: ["system", "budget"],
    queryFn: async () => {
      if (!actor) return 0n;
      return actor.getBudget();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 5000, // Poll every 5 seconds
  });
}

// ============= Mutations =============

export function useAddCitizen() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: InputCitizen) => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.addCitizen(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["citizens"] });
    },
  });
}

export function useAddCitizens() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (batch: InputCitizen[]) => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.addCitizens(batch);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["citizens"] });
    },
  });
}

export function useClaimBenefits() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      scheme,
      amount,
    }: {
      id: string;
      scheme: string;
      amount: bigint;
    }) => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.claimBenefits(id, scheme, amount);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["citizens"] });
      queryClient.invalidateQueries({ queryKey: ["system", "budget"] });
    },
  });
}

export function useUpdateAadhaarStatus() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: AadhaarStatus }) => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.updateAadhaarStatus(id, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["citizens"] });
    },
  });
}

export function useSetSystemStatus() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (status: SystemStatus) => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.setSystemStatus(status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system", "status"] });
    },
  });
}

export function useResetBudget() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (amount: bigint) => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.resetBudget(amount);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system", "budget"] });
    },
  });
}

export function useDeleteAllInactiveCitizens() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.deleteAllInactiveCitizens();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["citizens"] });
    },
  });
}
