package com.ergdashboard.android.domain

import com.google.gson.Gson
import org.junit.Assert.assertEquals
import org.junit.Test
import java.io.File

class GetTrainingLoadUseCaseTest {

    private val useCase = GetTrainingLoadUseCase()

    @Test
    fun `all fixture scenarios match`() {
        val json = File("test-fixtures/training-load/fixtures.json").readText()
        val fixtures = Gson().fromJson(json, FixturesWrapper::class.java)

        fixtures.scenarios.forEach { scenario ->
            val result = useCase(scenario.input)

            assertEquals(
                "Scenario '${scenario.description}': length",
                scenario.expected.size,
                result.size,
            )

            scenario.expected.forEachIndexed { i, expected ->
                val actual = result[i]
                assertEquals("'${scenario.description}' [$i] date", expected.date, actual.date)
                assertEquals("'${scenario.description}' [$i] ctl", expected.ctl, actual.ctl, 0.0)
                assertEquals("'${scenario.description}' [$i] atl", expected.atl, actual.atl, 0.0)
                assertEquals("'${scenario.description}' [$i] tsb", expected.tsb, actual.tsb, 0.0)
                assertEquals("'${scenario.description}' [$i] tss", expected.tss, actual.tss)
                assertEquals("'${scenario.description}' [$i] note", expected.note, actual.note)
            }
        }
    }

    private data class FixtureScenario(
        val description: String,
        val input: List<TssInput>,
        val expected: List<TrainingLoadEntry>,
    )

    private data class FixturesWrapper(
        val generated: String,
        val scenarios: List<FixtureScenario>,
    )
}
