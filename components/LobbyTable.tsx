"use client";

import React from "react";
import { Lock, Unlock, Users } from "lucide-react";

interface Room {
  id: string;
  name: string;
  playerCount: number;
  maxPlayers: number;
  hasPassword: boolean;
  status: "waiting" | "playing" | "finished";
}

interface LobbyTableProps {
  rooms: Room[];
  onJoin: (roomId: string) => void;
}

const LobbyTable: React.FC<LobbyTableProps> = ({ rooms, onJoin }) => {
  return (
    <div className="w-full">
      {/* Mobile View: Card Layout */}
      <div className="grid grid-cols-1 gap-4 sm:hidden">
        {rooms.length === 0 ? (
          <div className="bg-white rounded-2xl border-4 border-amber-900/10 p-12 text-center text-stone-400 font-bold italic shadow-xl">
            No rooms available. Create one to start!
          </div>
        ) : (
          rooms.map((room) => (
            <div
              key={room.id}
              className="bg-white rounded-2xl border-4 border-amber-900/10 p-5 shadow-xl flex flex-col gap-4"
            >
              <div className="flex justify-between items-start">
                <div className="flex flex-col">
                  <span className="text-amber-900 font-black text-xl leading-tight">
                    {room.name}
                  </span>
                  <span
                    className={`text-[10px] font-black uppercase tracking-widest mt-1 ${room.status === "playing" ? "text-amber-500" : "text-emerald-500"}`}
                  >
                    {room.status}
                  </span>
                </div>
                <div className="p-2 bg-stone-50 rounded-lg">
                  {room.hasPassword ? (
                    <Lock className="w-4 h-4 text-amber-600" />
                  ) : (
                    <Unlock className="w-4 h-4 text-emerald-500" />
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-stone-100 pt-4">
                <div className="flex items-center gap-2 text-stone-600">
                  <Users className="w-4 h-4 opacity-50" />
                  <span className="font-black text-sm">
                    {room.playerCount}/{room.maxPlayers} Players
                  </span>
                </div>

                <button
                  onClick={() => onJoin(room.id)}
                  disabled={
                    room.playerCount >= room.maxPlayers ||
                    room.status !== "waiting"
                  }
                  className={`
                    px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all
                    ${
                      room.playerCount >= room.maxPlayers ||
                      room.status !== "waiting"
                        ? "bg-stone-100 text-stone-400 cursor-not-allowed"
                        : "bg-emerald-500 hover:bg-emerald-400 text-white shadow-[0_4px_0_rgb(5,150,105)] active:shadow-none active:translate-y-1"
                    }
                  `}
                >
                  {room.status === "playing"
                    ? "In Progress"
                    : room.playerCount >= room.maxPlayers
                      ? "Full"
                      : "Join"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop View: Table Layout */}
      <div className="hidden sm:block overflow-x-auto rounded-xl border-4 border-amber-900/10 bg-white shadow-xl">
        <table className="w-full text-left border-collapse">
          <thead className="bg-stone-50 text-[10px] uppercase tracking-[0.2em] text-amber-900/40 font-black">
            <tr>
              <th className="px-6 py-5 font-black">Room Name</th>
              <th className="px-6 py-5 font-black">Players</th>
              <th className="px-6 py-5 font-black">Password</th>
              <th className="px-6 py-5 font-black text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {rooms.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-6 py-12 text-center text-stone-400 font-bold italic"
                >
                  No rooms available. Create one to start!
                </td>
              </tr>
            ) : (
              rooms.map((room) => (
                <tr
                  key={room.id}
                  className="hover:bg-stone-50 transition-colors group"
                >
                  <td className="px-6 py-5">
                    <div className="flex flex-col">
                      <span className="text-amber-900 font-black text-lg">
                        {room.name}
                      </span>
                      <span
                        className={`text-[10px] font-black uppercase tracking-widest ${room.status === "playing" ? "text-amber-500" : "text-emerald-500"}`}
                      >
                        {room.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2 text-stone-600">
                      <Users className="w-4 h-4 opacity-50" />
                      <span className="font-black">
                        {room.playerCount}/{room.maxPlayers}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    {room.hasPassword ? (
                      <Lock className="w-4 h-4 text-amber-600" />
                    ) : (
                      <Unlock className="w-4 h-4 text-emerald-500" />
                    )}
                  </td>
                  <td className="px-6 py-5 text-right">
                    <button
                      onClick={() => onJoin(room.id)}
                      disabled={
                        room.playerCount >= room.maxPlayers ||
                        room.status !== "waiting"
                      }
                      className={`
                        px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all
                        ${
                          room.playerCount >= room.maxPlayers ||
                          room.status !== "waiting"
                            ? "bg-stone-100 text-stone-400 cursor-not-allowed"
                            : "bg-emerald-500 hover:bg-emerald-400 text-white shadow-[0_4px_0_rgb(5,150,105)] active:shadow-none active:translate-y-1"
                        }
                      `}
                    >
                      {room.status === "playing"
                        ? "In Progress"
                        : room.playerCount >= room.maxPlayers
                          ? "Full"
                          : "Join"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LobbyTable;
