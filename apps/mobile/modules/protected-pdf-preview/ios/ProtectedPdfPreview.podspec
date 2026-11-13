require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name = 'ProtectedPdfPreview'
  s.version = package['version']
  s.summary = 'Private in-app PDF page rendering for 3Bigha mobile.'
  s.description = s.summary
  s.license = { :type => 'UNLICENSED' }
  s.author = '3Bigha'
  s.homepage = 'https://3bigha.com'
  s.platforms = { :ios => '16.4' }
  s.swift_version = '5.9'
  s.source = { :git => 'https://3bigha.com' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = '**/*.{h,m,mm,swift}'
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end
