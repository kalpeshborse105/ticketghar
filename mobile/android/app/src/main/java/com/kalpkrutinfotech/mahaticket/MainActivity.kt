package com.kalpkrutinfotech.mahaticket

import android.content.Intent
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  /**
   * Returns the name of the main component registered from JavaScript.
   * Must match app.json "name".
   */
  override fun getMainComponentName(): String = "MahaTicket"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  override fun onNewIntent(intent: Intent?) {
    super.onNewIntent(intent)
    setIntent(intent)
  }

  /**
   * When JS does not consume the hardware back press (root tab), send the app to the
   * background instead of finishing the Activity — matches common Android UX.
   */
  override fun invokeDefaultOnBackPressed() {
    if (!moveTaskToBack(true)) {
      super.invokeDefaultOnBackPressed()
    }
  }
}
