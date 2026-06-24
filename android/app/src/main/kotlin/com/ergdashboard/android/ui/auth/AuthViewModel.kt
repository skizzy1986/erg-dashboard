package com.ergdashboard.android.ui.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.ViewModelProvider.AndroidViewModelFactory.Companion.APPLICATION_KEY
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.ergdashboard.android.ErgDashboardApplication
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.auth.providers.builtin.Email
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed class AuthUiState {
    object Loading : AuthUiState()
    object Authenticated : AuthUiState()
    data class Unauthenticated(val errorMessage: String = "") : AuthUiState()
}

class AuthViewModel(private val supabase: SupabaseClient) : ViewModel() {

    private val _uiState: MutableStateFlow<AuthUiState> = MutableStateFlow(AuthUiState.Loading)
    val uiState: StateFlow<AuthUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            _uiState.value = if (supabase.auth.currentSessionOrNull() != null)
                AuthUiState.Authenticated
            else
                AuthUiState.Unauthenticated()
        }
    }

    fun signIn(email: String, password: String) {
        viewModelScope.launch {
            try {
                supabase.auth.signInWith(Email) {
                    this.email = email
                    this.password = password
                }
                _uiState.value = AuthUiState.Authenticated
            } catch (e: Exception) {
                _uiState.value = AuthUiState.Unauthenticated(e.message ?: "Sign-in failed")
            }
        }
    }

    fun signOut() {
        viewModelScope.launch {
            supabase.auth.signOut()
            _uiState.value = AuthUiState.Unauthenticated()
        }
    }

    companion object {
        val Factory: ViewModelProvider.Factory = viewModelFactory {
            initializer {
                val app = this[APPLICATION_KEY] as ErgDashboardApplication
                AuthViewModel(app.container.supabase)
            }
        }
    }
}
