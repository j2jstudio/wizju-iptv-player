<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { storageMigrationService, type MigrationResult } from '@/services/storageMigration'
import UiButton from '@/components/ui/UiButton.vue'
import UiCard from '@/components/ui/UiCard.vue'

interface MigrationProgress {
  stage: string
  current: number
  total: number
  message: string
}

const migrationStatus = ref<'completed' | 'pending' | 'none'>('none')
const isMigrating = ref(false)
const migrationResult = ref<MigrationResult | null>(null)
const migrationProgress = ref<MigrationProgress | null>(null)
const showDetails = ref(false)

const emit = defineEmits<{
  (e: 'migration-complete'): void
  (e: 'skip-migration'): void
}>()

// Computed properties
const progressPercentage = computed(() => {
  if (!migrationProgress.value) return 0
  const { current, total } = migrationProgress.value
  if (total === 0) return 0
  return Math.round((current / total) * 100)
})

const stageLabel = computed(() => {
  if (!migrationProgress.value) return ''
  const stage = migrationProgress.value.stage
  const labels: Record<string, string> = {
    initialization: 'Initializing Database',
    reading: 'Reading Data',
    backup: 'Creating Backup',
    sources: 'Migrating Stream Sources',
    mediaItems: 'Migrating Media Items',
    favorites: 'Migrating Favorites',
    recentWatching: 'Migrating Watch History',
    validation: 'Validating Data',
    cleanup: 'Cleaning Up Old Data',
    rollback: 'Rolling Back Changes',
  }
  return labels[stage] || stage
})

const hasPendingMigration = computed(() => migrationStatus.value === 'pending')
const migrationCompleted = computed(() => migrationStatus.value === 'completed')

// Methods
const checkMigrationStatus = async () => {
  try {
    migrationStatus.value = storageMigrationService.getMigrationStatus()
    
    if (migrationStatus.value === 'completed') {
      console.log('[StorageMigration] Migration already completed')
    } else if (migrationStatus.value === 'pending') {
      const hasOldData = await storageMigrationService.detectOldData()
      if (!hasOldData) {
        migrationStatus.value = 'none'
      }
    }
  } catch (error) {
    console.error('[StorageMigration] Failed to check migration status:', error)
  }
}

const startMigration = async () => {
  if (isMigrating.value) return

  isMigrating.value = true
  migrationResult.value = null
  migrationProgress.value = null

  try {
    const result = await storageMigrationService.executeMigration((progress) => {
      migrationProgress.value = progress
    })

    migrationResult.value = result

    if (result.success) {
      migrationStatus.value = 'completed'
      setTimeout(() => {
        emit('migration-complete')
      }, 2000)
    }
  } catch (error) {
    console.error('[StorageMigration] Migration failed:', error)
    if (!migrationResult.value) {
      migrationResult.value = {
        success: false,
        migratedSources: 0,
        migratedMediaItems: 0,
        migratedFavorites: 0,
        migratedRecents: 0,
        errors: [`Migration failed: ${error}`],
      }
    }
  } finally {
    isMigrating.value = false
  }
}

const skipMigration = () => {
  emit('skip-migration')
}

const toggleDetails = () => {
  showDetails.value = !showDetails.value
}

// Lifecycle
onMounted(() => {
  checkMigrationStatus()
})
</script>

<template>
  <div class="storage-migration">
    <!-- Pending Migration Notice -->
    <UiCard v-if="hasPendingMigration && !isMigrating && !migrationResult" class="migration-notice">
      <div class="notice-header">
        <svg
          class="notice-icon"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
          />
        </svg>
        <h3 class="notice-title">Data Migration Required</h3>
      </div>

      <p class="notice-message">
        Old storage data detected. To achieve better performance and larger storage capacity, we recommend migrating your data to the new storage system.
      </p>

      <div class="notice-benefits">
        <h4 class="benefits-title">Improvements After Migration:</h4>
        <ul class="benefits-list">
          <li>✅ Larger storage capacity (from 5-10MB to hundreds of MB)</li>
          <li>✅ Faster data access speed</li>
          <li>✅ Better performance and response time</li>
          <li>✅ Support for more media content</li>
        </ul>
      </div>

      <div class="notice-actions">
        <UiButton @click="startMigration" variant="default" size="lg">
          Start Migration
        </UiButton>
        <UiButton @click="skipMigration" variant="ghost" size="lg">
          Migrate Later
        </UiButton>
      </div>

      <p class="notice-info">
        Note: A backup will be created automatically during migration. If migration fails, the original data will be restored automatically.
      </p>
    </UiCard>

    <!-- Migration Progress -->
    <UiCard v-if="isMigrating" class="migration-progress">
      <div class="progress-header">
        <h3 class="progress-title">Migrating Data...</h3>
        <p class="progress-message">{{ migrationProgress?.message || 'Preparing...' }}</p>
      </div>

      <div class="progress-bar-container">
        <div class="progress-bar">
          <div
            class="progress-bar-fill"
            :style="{ width: `${progressPercentage}%` }"
          ></div>
        </div>
        <div class="progress-text">
          {{ stageLabel }} - {{ progressPercentage }}%
        </div>
      </div>

      <div v-if="migrationProgress" class="progress-details">
        <div class="progress-stats">
          <span>Current Progress: {{ migrationProgress.current }} / {{ migrationProgress.total }}</span>
        </div>
      </div>

      <div class="progress-info">
        <svg
          class="spinner"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          ></circle>
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
        <span>Please do not close this page...</span>
      </div>
    </UiCard>

    <!-- Migration Result -->
    <UiCard v-if="migrationResult && !isMigrating" class="migration-result">
      <div v-if="migrationResult.success" class="result-success">
        <svg
          class="result-icon success"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <h3 class="result-title">Migration Successful!</h3>
        <p class="result-message">All data has been successfully migrated to the new storage system.</p>
      </div>

      <div v-else class="result-error">
        <svg
          class="result-icon error"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          />
        </svg>
        <h3 class="result-title">Migration Failed</h3>
        <p class="result-message">An error occurred during migration. Original data has been preserved.</p>
      </div>

      <!-- Migration Statistics -->
      <div class="result-stats">
        <div class="stat-item">
          <span class="stat-label">Stream Sources:</span>
          <span class="stat-value">{{ migrationResult.migratedSources }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Media Items:</span>
          <span class="stat-value">{{ migrationResult.migratedMediaItems }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Favorites:</span>
          <span class="stat-value">{{ migrationResult.migratedFavorites }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Watch History:</span>
          <span class="stat-value">{{ migrationResult.migratedRecents }}</span>
        </div>
      </div>

      <!-- Error Details -->
      <div v-if="migrationResult.errors.length > 0" class="result-errors">
        <button @click="toggleDetails" class="toggle-details">
          {{ showDetails ? 'Hide' : 'Show' }} Error Details
        </button>
        <div v-if="showDetails" class="error-list">
          <p v-for="(error, index) in migrationResult.errors" :key="index" class="error-item">
            {{ error }}
          </p>
        </div>
      </div>

      <!-- Actions -->
      <div class="result-actions">
        <UiButton
          v-if="migrationResult.success"
          @click="emit('migration-complete')"
          variant="default"
          size="lg"
        >
          Continue
        </UiButton>
        <UiButton
          v-else
          @click="startMigration"
          variant="default"
          size="lg"
        >
          Retry Migration
        </UiButton>
        <UiButton
          v-if="!migrationResult.success"
          @click="skipMigration"
          variant="ghost"
          size="lg"
        >
          Try Later
        </UiButton>
      </div>
    </UiCard>

    <!-- Migration Completed Notice (for info only) -->
    <div v-if="migrationCompleted && !migrationResult" class="migration-completed">
      <svg
        class="completed-icon"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke-width="1.5"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <span>Data migration completed</span>
    </div>
  </div>
</template>

<style scoped>
.storage-migration {
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
}

/* Migration Notice */
.migration-notice {
  padding: 2rem;
}

.notice-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.notice-icon {
  width: 2.5rem;
  height: 2.5rem;
  color: #f59e0b;
  flex-shrink: 0;
}

.notice-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.notice-message {
  font-size: 1rem;
  color: var(--color-text-secondary);
  line-height: 1.6;
  margin-bottom: 1.5rem;
}

.notice-benefits {
  background: var(--color-surface-secondary);
  padding: 1.25rem;
  border-radius: 0.5rem;
  margin-bottom: 1.5rem;
}

.benefits-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 0.75rem;
}

.benefits-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.benefits-list li {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  padding: 0.4rem 0;
}

.notice-actions {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.notice-info {
  font-size: 0.85rem;
  color: var(--color-text-tertiary);
  font-style: italic;
}

/* Migration Progress */
.migration-progress {
  padding: 2rem;
}

.progress-header {
  margin-bottom: 2rem;
}

.progress-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 0.5rem;
}

.progress-message {
  font-size: 0.95rem;
  color: var(--color-text-secondary);
}

.progress-bar-container {
  margin-bottom: 1.5rem;
}

.progress-bar {
  width: 100%;
  height: 0.75rem;
  background: var(--color-surface-secondary);
  border-radius: 9999px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #8b5cf6);
  border-radius: 9999px;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  text-align: center;
}

.progress-details {
  background: var(--color-surface-secondary);
  padding: 1rem;
  border-radius: 0.5rem;
  margin-bottom: 1.5rem;
}

.progress-stats {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
}

.progress-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  color: var(--color-text-tertiary);
  font-size: 0.9rem;
}

.spinner {
  width: 1.5rem;
  height: 1.5rem;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* Migration Result */
.migration-result {
  padding: 2rem;
}

.result-success,
.result-error {
  text-align: center;
  margin-bottom: 2rem;
}

.result-icon {
  width: 4rem;
  height: 4rem;
  margin: 0 auto 1rem;
}

.result-icon.success {
  color: #10b981;
}

.result-icon.error {
  color: #ef4444;
}

.result-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 0.5rem;
}

.result-message {
  font-size: 1rem;
  color: var(--color-text-secondary);
}

.result-stats {
  background: var(--color-surface-secondary);
  padding: 1.5rem;
  border-radius: 0.5rem;
  margin-bottom: 1.5rem;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--color-border);
}

.stat-item:last-child {
  border-bottom: none;
}

.stat-label {
  font-size: 0.95rem;
  color: var(--color-text-secondary);
}

.stat-value {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.result-errors {
  margin-bottom: 1.5rem;
}

.toggle-details {
  width: 100%;
  padding: 0.75rem;
  background: var(--color-surface-secondary);
  border: none;
  border-radius: 0.375rem;
  color: var(--color-text-primary);
  font-size: 0.9rem;
  cursor: pointer;
  transition: background 0.2s;
}

.toggle-details:hover {
  background: var(--color-surface-tertiary);
}

.error-list {
  margin-top: 1rem;
  padding: 1rem;
  background: var(--color-surface-error);
  border-radius: 0.375rem;
}

.error-item {
  font-size: 0.85rem;
  color: var(--color-text-error);
  margin: 0.5rem 0;
  padding: 0;
}

.result-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

/* Migration Completed */
.migration-completed {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 1rem;
  background: var(--color-success-bg);
  border-radius: 0.5rem;
  color: var(--color-success);
  font-size: 0.95rem;
}

.completed-icon {
  width: 1.5rem;
  height: 1.5rem;
}

/* Responsive */
@media (max-width: 640px) {
  .migration-notice,
  .migration-progress,
  .migration-result {
    padding: 1.5rem;
  }

  .notice-actions,
  .result-actions {
    flex-direction: column;
  }

  .notice-actions button,
  .result-actions button {
    width: 100%;
  }
}
</style>
