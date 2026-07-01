package com.steve1316.uma_android_automation.bot

/** Counts consecutive failed attempts and signals when a configured cap is reached. */
class RetryGuard(private val max: Int) {
    @Volatile private var count = 0

    val exceeded: Boolean get() = count >= max

    /** Increments the failure counter. Returns true when the cap is first reached. */
    fun attempt(): Boolean {
        count++
        return count >= max
    }

    fun reset() {
        count = 0
    }
}
