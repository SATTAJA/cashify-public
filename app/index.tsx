import { useEffect } from "react";
import { View } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { router } from "expo-router";
import { supabase } from "../lib/supabase";

export default function SplashScreen() {
  // Inisialisasi video player dengan file lokal
  const videoSource = require("../assets/video/splash-video.mp4");
  const player = useVideoPlayer(videoSource, (player) => {
    player.loop = false;
    player.muted = false;
    player.play();
  });

  useEffect(() => {
    const checkSessionAndNavigate = async () => {
      // Tunggu video selesai diputar (2 detik)
      setTimeout(async () => {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        
        if (session) {
          router.replace("/(tabs)/home");
        } else {
          router.replace("/auth");
        }
      }, 2500); // 2 detik sesuai durasi video
    };

    checkSessionAndNavigate();
    
    // HAPUS cleanup function ini:
    // return () => {
    //   player.pause(); // ❌ JANGAN lakukan ini
    // };
  }, [player]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#151716",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <VideoView
        player={player}
        style={{
          width: "100%",
          height: "100%",
        }}
        contentFit="contain"
        nativeControls={false}
      />
    </View>
  );
}