import type {
  CapacitorConfig,
} from "@capacitor/cli";


const config:
  CapacitorConfig = {

    appId:
      "com.rosehome.rentalmanagement",

    appName:
      "Rosehome",

    webDir:
      "dist",

    plugins: {

      SystemBars: {

        insetsHandling:
          "css",

        style:
          "LIGHT",

        hidden:
          false,

      },


      Keyboard: {

        resizeOnFullScreen:
          true,

      },


      SplashScreen: {

        // Nền của splash hệ thống Android.
        backgroundColor:
          "#fff9f4",

        // Không hiện vòng loading mặc định.
        showSpinner:
          false,

      },

    },

  };


export default config;