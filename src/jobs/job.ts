export interface Job {
  /**
   * Executes the job
   */
  execute(): void;

  /**
   * Shutdown the job
   */
  shutdown(): void;
}
