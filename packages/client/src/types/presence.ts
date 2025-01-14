export type PresenceConfig = {
    userId: string;
    userData: UserData;
    hubId?: string;
    roomId?: string;
  };
  
  export type PresenceType = "global" | "hub" | "room";
  
  export type UserStatus = "ONLINE" | "OFFLINE" | "BUSY" | "AVAILABLE";
  export type BusyReason = "IN_ROOM" | "USER_SET";
  
  export type UserData = {
    name: string;
    avatar_url: string;
  };
  
  export type PresenceData = {
    user_id: string;
    timestamp: string;
    status?: UserStatus;
    busy_reason?: BusyReason;
    user_data: UserData;
  };