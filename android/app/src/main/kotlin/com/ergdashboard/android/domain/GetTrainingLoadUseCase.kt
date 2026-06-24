package com.ergdashboard.android.domain

import java.time.LocalDate
import kotlin.math.exp
import kotlin.math.roundToInt

data class TssInput(
    val date: String,
    val tss: Int,
    val note: String,
)

data class TrainingLoadEntry(
    val date: String,
    val ctl: Double,
    val atl: Double,
    val tsb: Double,
    val tss: Int,
    val note: String,
)

class GetTrainingLoadUseCase {

    companion object {
        private val CTL_K = exp(-1.0 / 42)
        private val ATL_K = exp(-1.0 / 7)
    }

    operator fun invoke(tssData: List<TssInput>): List<TrainingLoadEntry> {
        val tssMap = tssData.associateBy { it.date }
        val start = LocalDate.parse(tssData.first().date)
        val end = tssData.maxOf { LocalDate.parse(it.date) }

        val results = mutableListOf<TrainingLoadEntry>()
        var ctl = 0.0
        var atl = 0.0
        var current = start

        while (!current.isAfter(end)) {
            val key = current.toString()
            val input = tssMap[key]
            val tss = input?.tss ?: 0

            ctl = ctl * CTL_K + tss * (1 - CTL_K)
            atl = atl * ATL_K + tss * (1 - ATL_K)

            results.add(
                TrainingLoadEntry(
                    date = key.substring(5).replace("-", "/"),
                    ctl = round1dp(ctl),
                    atl = round1dp(atl),
                    tsb = round1dp(ctl - atl),
                    tss = tss,
                    note = input?.note ?: "",
                )
            )

            current = current.plusDays(1)
        }

        return results
    }

    private fun round1dp(value: Double): Double = (value * 10).roundToInt() / 10.0
}
