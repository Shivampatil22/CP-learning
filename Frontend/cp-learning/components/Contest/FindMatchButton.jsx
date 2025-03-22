"use client"

import { useBattleStore } from "@/lib/store"
import { Button } from "../ui/button"

const FindMatchButton = ({socket ,isFinding,setIsFinding}) => {
  const {userInfo}=useBattleStore();
  const { username, current_rating, tags } = userInfo;
  return (
    <Button
    onClick={()=>{
     if(isFinding){
      socket.emit("stopFinding");
  
     }else{
       const user = {
         username,
         current_rating,
         tags,
         socketId: socket.id,
       };
       console.log(user);
       socket.emit("findMatch", { userDetails: user });
     }
      setIsFinding((state) => !state);
     
      
    }}
    >
      {isFinding?"Stop finding":"Find a match"} 
    </Button>
  )
}

export default FindMatchButton
