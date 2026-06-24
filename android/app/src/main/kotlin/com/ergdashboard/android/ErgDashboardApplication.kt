package com.ergdashboard.android

import android.app.Application
import com.ergdashboard.android.data.AppContainer

class ErgDashboardApplication : Application() {
    lateinit var container: AppContainer

    override fun onCreate() {
        super.onCreate()
        container = AppContainer(this)
    }
}
