package com.ergdashboard.android.ui.navigation

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.BarChart
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.List
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.ergdashboard.android.ui.dashboard.DashboardScreen
import com.ergdashboard.android.ui.home.HomeScreen
import com.ergdashboard.android.ui.sessions.SessionsScreen
import com.ergdashboard.android.ui.vitals.VitalsScreen

private sealed class AppScreen(val route: String, val label: String, val icon: ImageVector) {
    object Home : AppScreen("home", "Home", Icons.Default.Home)
    object Sessions : AppScreen("sessions", "Sessions", Icons.Default.List)
    object Pmc : AppScreen("pmc", "PMC", Icons.Default.BarChart)
    object Vitals : AppScreen("vitals", "Vitals", Icons.Default.Favorite)
}

private val bottomNavItems = listOf(AppScreen.Home, AppScreen.Sessions, AppScreen.Pmc, AppScreen.Vitals)

@Composable
fun AppNavGraph() {
    val navController = rememberNavController()
    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = backStackEntry?.destination?.route

    Scaffold(
        bottomBar = {
            NavigationBar {
                bottomNavItems.forEach { screen ->
                    NavigationBarItem(
                        selected = currentRoute == screen.route,
                        onClick = {
                            navController.navigate(screen.route) {
                                popUpTo(navController.graph.startDestinationId) { saveState = true }
                                launchSingleTop = true
                                restoreState = true
                            }
                        },
                        icon = { Icon(screen.icon, contentDescription = screen.label) },
                        label = { Text(screen.label) },
                    )
                }
            }
        },
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = AppScreen.Home.route,
            modifier = Modifier.padding(innerPadding),
        ) {
            composable(AppScreen.Home.route) { HomeScreen() }
            composable(AppScreen.Sessions.route) { SessionsScreen() }
            composable(AppScreen.Pmc.route) { DashboardScreen() }
            composable(AppScreen.Vitals.route) { VitalsScreen() }
        }
    }
}
