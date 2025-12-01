/**
 * Type declarations for bcrypt
 * These should be replaced by @types/bcrypt when pnpm is working
 */
declare module "bcrypt" {
  /**
   * Generates a salt
   * @param rounds - Number of rounds to process the salt. Default is 10.
   */
  export function genSalt(rounds?: number): Promise<string>;
  export function genSaltSync(rounds?: number): string;

  /**
   * Hashes a password
   * @param data - Data to hash
   * @param saltOrRounds - Salt or number of rounds
   */
  export function hash(
    data: string | Buffer,
    saltOrRounds: string | number
  ): Promise<string>;
  export function hashSync(
    data: string | Buffer,
    saltOrRounds: string | number
  ): string;

  /**
   * Compares a password with a hash
   * @param data - Data to compare
   * @param encrypted - Hash to compare against
   */
  export function compare(
    data: string | Buffer,
    encrypted: string
  ): Promise<boolean>;
  export function compareSync(
    data: string | Buffer,
    encrypted: string
  ): boolean;

  /**
   * Gets the number of rounds used to generate a hash
   * @param encrypted - Hash to get rounds from
   */
  export function getRounds(encrypted: string): number;
}
