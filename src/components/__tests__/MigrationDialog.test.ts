import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import MigrationDialog from '../MigrationDialog.vue'

describe('MigrationDialog', () => {
  it('accepts migration type prop', () => {
    const wrapper = mount(MigrationDialog, {
      props: {
        open: true,
        migrationType: 'storage'
      },
      attachTo: document.body
    })
    
    expect(wrapper.exists()).toBe(true)
    wrapper.unmount()
  })

  it('accepts migration type as settings', () => {
    const wrapper = mount(MigrationDialog, {
      props: {
        open: true,
        migrationType: 'settings'
      },
      attachTo: document.body
    })
    
    expect(wrapper.exists()).toBe(true)
    wrapper.unmount()
  })

  it('accepts is Migrating flag', () => {
    const wrapper = mount(MigrationDialog, {
      props: {
        open: true,
        migrationType: 'storage',
        isMigrating: true,
        progress: 50
      },
      attachTo: document.body
    })
    
    expect(wrapper.props('isMigrating')).toBe(true)
    expect(wrapper.props('progress')).toBe(50)
    wrapper.unmount()
  })

  it('accepts isComplete flag', () => {
    const wrapper = mount(MigrationDialog, {
      props: {
        open: true,
        migrationType: 'storage',
        isComplete: true
      },
      attachTo: document.body
    })
    
    expect(wrapper.props('isComplete')).toBe(true)
    wrapper.unmount()
  })

  it('accepts error message', () => {
    const wrapper = mount(MigrationDialog, {
      props: {
        open: true,
        migrationType: 'storage',
        error: 'Migration failed!'
      },
      attachTo: document.body
    })
    
    expect(wrapper.props('error')).toBe('Migration failed!')
    wrapper.unmount()
  })

  it('accepts total items and migrated items', () => {
    const wrapper = mount(MigrationDialog, {
      props: {
        open: true,
        migrationType: 'storage',
        isMigrating: true,
        totalItems: 100,
        migratedItems: 45
      },
      attachTo: document.body
    })
    
    expect(wrapper.props('totalItems')).toBe(100)
    expect(wrapper.props('migratedItems')).toBe(45)
    wrapper.unmount()
  })

  it('accepts canRollback flag', () => {
    const wrapper = mount(MigrationDialog, {
      props: {
        open: true,
        migrationType: 'storage',
        error: 'Something went wrong',
        canRollback: true
      },
      attachTo: document.body
    })
    
    expect(wrapper.props('canRollback')).toBe(true)
    wrapper.unmount()
  })

  it('can be closed', () => {
    const wrapper = mount(MigrationDialog, {
      props: {
        open: false,
        migrationType: 'storage'
      },
      attachTo: document.body
    })
    
    expect(wrapper.props('open')).toBe(false)
    wrapper.unmount()
  })

  it('component renders successfully', () => {
    const wrapper = mount(MigrationDialog, {
      props: {
        open: true,
        migrationType: 'navigation',
        isMigrating: false,
        isComplete: false,
        progress: 0
      },
      attachTo: document.body
    })
    
    expect(wrapper.vm).toBeTruthy()
    wrapper.unmount()
  })
})
