const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const moduleSource = `package com.atominosconsulting.nahom

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class NahomUpiModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context), ActivityEventListener {
  companion object {
    private const val REQUEST_CODE = 4817
    private val RESPONSE_KEYS = setOf(
      "status", "upistatus", "result", "txnid", "transactionid", "transaction_id", "txn",
      "txnref", "txn_ref", "referenceid", "reference_id", "responsecode", "response_code",
      "code", "approvalrefno", "approval_ref_no", "approvalref", "errorcode", "error_code", "errcode"
    )
  }

  private var pendingPromise: Promise? = null
  private var pendingAttemptId: String? = null

  init {
    context.addActivityEventListener(this)
  }

  override fun getName(): String = "NahomUpi"

  @ReactMethod
  fun launchPayment(uri: String, attemptId: String, packageName: String?, promise: Promise) {
    if (pendingPromise != null) {
      promise.reject("UPI_ALREADY_ACTIVE", "Another UPI payment attempt is already active.")
      return
    }
    val activity = reactApplicationContext.currentActivity ?: getCurrentActivity()
    if (activity == null) {
      promise.reject("UPI_ACTIVITY_UNAVAILABLE", "The Android activity is not available.")
      return
    }
    val intent = try {
      Intent(Intent.ACTION_VIEW, Uri.parse(uri))
    } catch (error: Exception) {
      promise.reject("UPI_INVALID_URI", "The UPI payment URI is invalid.", error)
      return
    }

    if (!packageName.isNullOrBlank()) {
      intent.setPackage(packageName.trim())
    }

    val targetIntent = if (packageName.isNullOrBlank()) {
      Intent.createChooser(intent, "Pay with UPI")
    } else {
      intent
    }

    pendingPromise = promise
    pendingAttemptId = attemptId
    try {
      activity.startActivityForResult(targetIntent, REQUEST_CODE)
    } catch (error: Exception) {
      pendingPromise = null
      pendingAttemptId = null
      promise.reject("UPI_LAUNCH_FAILED", "Unable to launch a UPI application.", error)
    }
  }

  @ReactMethod
  fun launchPaymentLegacy(uri: String, attemptId: String, promise: Promise) {
    launchPayment(uri, attemptId, null, promise)
  }

  override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
    if (requestCode != REQUEST_CODE) return
    val promise = pendingPromise ?: return
    val attemptId = pendingAttemptId
    pendingPromise = null
    pendingAttemptId = null

    val result = Arguments.createMap()
    if (attemptId != null) result.putString("attemptId", attemptId)
    val raw = responseUri(data, resultCode)
    result.putString("raw", raw)
    promise.resolve(result)
  }

  override fun onNewIntent(intent: Intent) = Unit

  private fun responseUri(data: Intent?, resultCode: Int): String {
    val returnedUri = data?.dataString
    if (!returnedUri.isNullOrBlank()) return returnedUri
    val builder = Uri.Builder().scheme("nahom").authority("upi-result")
    val extras = data?.extras
    var added = false
    extras?.keySet()?.forEach { key ->
      if (!RESPONSE_KEYS.contains(key.lowercase())) return@forEach
      val value = scalarValue(extras, key) ?: return@forEach
      builder.appendQueryParameter(key, value)
      added = true
    }
    if (!added && resultCode == Activity.RESULT_CANCELED) builder.appendQueryParameter("status", "CANCELLED")
    return builder.build().toString()
  }

  private fun scalarValue(bundle: Bundle, key: String): String? {
    val value = bundle.get(key) ?: return null
    return when (value) {
      is String, is Number, is Boolean -> value.toString().takeIf { it.isNotBlank() && it.length <= 200 }
      else -> null
    }
  }
}

class NahomUpiPackage : com.facebook.react.ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext) = listOf(NahomUpiModule(reactContext))
  override fun createViewManagers(reactContext: ReactApplicationContext) = emptyList<com.facebook.react.uimanager.ViewManager<*, *>>()
}
`;

module.exports = function withNahomUpi(config) {
  return withDangerousMod(config, ['android', async (currentConfig) => {
    const androidRoot = currentConfig.modRequest.platformProjectRoot;
    const packagePath = path.join(androidRoot, 'app', 'src', 'main', 'java', 'com', 'atominosconsulting', 'nahom');
    fs.mkdirSync(packagePath, { recursive: true });
    fs.writeFileSync(path.join(packagePath, 'NahomUpiModule.kt'), moduleSource);
    const mainApplicationPath = path.join(packagePath, 'MainApplication.kt');
    if (fs.existsSync(mainApplicationPath)) {
      const source = fs.readFileSync(mainApplicationPath, 'utf8');
      if (!source.includes('add(NahomUpiPackage())')) {
        fs.writeFileSync(mainApplicationPath, source.replace('          // add(MyReactNativePackage())', '          // add(MyReactNativePackage())\n          add(NahomUpiPackage())'));
      }
    }
    return currentConfig;
  }]);
};
