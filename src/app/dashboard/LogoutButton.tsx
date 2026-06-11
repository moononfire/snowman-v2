'use client'

import { logoutAction } from './actions'

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className="w-full text-left text-sm text-gray-500 hover:text-gray-900 px-3 py-2 rounded hover:bg-gray-100"
      >
        Wyloguj
      </button>
    </form>
  )
}
