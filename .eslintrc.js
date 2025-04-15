module.exports = {
  extends: 'next/core-web-vitals',
  rules: {
    // 禁用未使用变量的警告
    '@typescript-eslint/no-unused-vars': 'off',
    
    // 禁用any类型的警告
    '@typescript-eslint/no-explicit-any': 'off',
    
    // 禁用空接口的警告
    '@typescript-eslint/no-empty-interface': 'off',
    
    // 禁用React Hook依赖警告
    'react-hooks/exhaustive-deps': 'off',
    
    // 禁用空对象类型的警告
    '@typescript-eslint/no-empty-object-type': 'off'
  }
}; 