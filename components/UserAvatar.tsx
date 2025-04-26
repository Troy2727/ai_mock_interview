"use client"

import Image from "next/image";
import { generateAvatarUrl } from "@/lib/utils";

interface UserAvatarProps {
  user: {
    name: string;
    avatar?: string;
  };
  size?: number;
  className?: string;
}

const UserAvatar = ({ user, size = 40, className = "" }: UserAvatarProps) => {
  // Use the user's avatar if available, otherwise generate one based on the name
  const avatarUrl = user.avatar || generateAvatarUrl(user.name, size);

  return (
    <div className={`relative rounded-full overflow-hidden ${className}`} style={{ width: size, height: size }}>
      <Image
        src={avatarUrl}
        alt={`${user.name}'s avatar`}
        width={size}
        height={size}
        className="object-cover"
      />
    </div>
  );
};

export default UserAvatar;
